import { Werft } from './util/werft';
import * as Tracing from './observability/tracing';
import { SpanStatusCode } from '@opentelemetry/api';
import { wipePreviewEnvironmentAndNamespace, helmInstallName, listAllPreviewNamespaces } from './util/kubectl';
import { exec } from './util/shell';
import { previewNameFromBranchName } from './util/preview';
import { CORE_DEV_KUBECONFIG_PATH } from './jobs/build/const';

// Will be set once tracing has been initialized
let werft: Werft

let previewsToDelete = [];

Tracing.initialize()
    .then(() => {
        werft = new Werft("delete-preview-environment-cron")
    })
    .then(() => deletePreviewEnvironments())
    .catch((err) => {
        werft.rootSpan.setStatus({
            code: SpanStatusCode.ERROR,
            message: err
        })
    })
    .finally(() => {
        werft.phase("Flushing telemetry", "Flushing telemetry before stopping job")
        werft.endAllSpans()
    })

async function deletePreviewEnvironments() {

    werft.phase("prep");
    try {
        const GCLOUD_SERVICE_ACCOUNT_PATH = "/mnt/secrets/gcp-sa/service-account.json";
        exec(`gcloud auth activate-service-account --key-file "${GCLOUD_SERVICE_ACCOUNT_PATH}"`);
        exec(`KUBECONFIG=${CORE_DEV_KUBECONFIG_PATH} gcloud container clusters get-credentials core-dev --zone europe-west1-b --project gitpod-core-dev`);
    } catch (err) {
        werft.fail("prep", err)
    }
    werft.done("prep")

    werft.phase("Fetching previews");
    let previews: string[]
    try {
        previews = listAllPreviewNamespaces(CORE_DEV_KUBECONFIG_PATH, {});
    } catch (err) {
        werft.fail("Fetching previews", err)
    }
    werft.done("Fetching previews");

    werft.phase("Fetching outdated branches");
    const branches = getAllBranches();
    const outdatedPreviews = [];
    // During the transition from the old preview names to the new ones we have to check for the existence of both the old or new
    // preview name patterns before it is safe to delete a namespace.
    branches.forEach(branch => {
        const lastCommit = exec(`git log ${branch} --since=$(date +%Y-%m-%d -d "5 days ago")`, { silent: true })
        if ( lastCommit.length < 1 ) {
            const outdatedPreview = parseBranch(branch)
            outdatedPreviews.push(outdatedPreview.trim())
        }
    })
    const expectedPreviewEnvironmentNamespaces = new Set(branches.flatMap(branch => [parseBranch(branch), expectedNamespaceFromBranch(branch)]));

    werft.phase("checking activity")
    previews.forEach(previewNS => {
        checkActivity(previewNS);
    })

    werft.phase("deleting previews")
    try {
        previewsToDelete = previewsToDelete.concat(previews.filter(ns => !expectedPreviewEnvironmentNamespaces.has(ns)))
        previewsToDelete = previewsToDelete.concat(previews.filter(ns => new Set(outdatedPreviews).has(ns)))
        previewsToDelete.forEach(previewNs => werft.log("Deleting previews", previewNs))
        // Trigger namespace deletion in parallel
        // const promises = previewsToDelete.map(preview => wipePreviewEnvironmentAndNamespace(helmInstallName, preview, CORE_DEV_KUBECONFIG_PATH, { slice: `Deleting preview ${preview}` }));
        // // But wait for all of them to finish before (or one of them to fail) before we continue
        // await Promise.all(promises)
    } catch (err) {
        werft.fail("deleting previews", err)
    }
    werft.done("deleting previews")
}

async function checkActivity(previewNS) {

    const statusNS = exec(`KUBECONFIG=${CORE_DEV_KUBECONFIG_PATH} kubectl get ns ${previewNS} -o jsonpath='{.status.phase}'`, { silent: true})

    if ( statusNS == "Active") {

        const emptyNS = exec(`KUBECONFIG=${CORE_DEV_KUBECONFIG_PATH} kubectl get pods -n ${previewNS} -o jsonpath='{.items.*}'`, { silent: true})

        if ( emptyNS.length < 1 )
            return;

        const statusDB = exec(`KUBECONFIG=${CORE_DEV_KUBECONFIG_PATH} kubectl get pods mysql-0 -n ${previewNS} -o jsonpath='{.status.phase}'`, { silent: true})
        const statusDbContainer = exec(`KUBECONFIG=${CORE_DEV_KUBECONFIG_PATH} kubectl get pods mysql-0 -n staging-server-vscode-oauth2 -o jsonpath='{.status.containerStatuses.*.ready}'`, { silent: true})

        if (statusDB.code == 0 && statusDB == "Running" && statusDbContainer != "false") {

            const connectionToDb = `KUBECONFIG=${CORE_DEV_KUBECONFIG_PATH} kubectl get secret db-password -n ${previewNS} -o jsonpath='{.data.mysql-root-password}' | base64 -d | mysql --host=db.${previewNS}.svc.cluster.local --port=3306 --user=root --database=gitpod -s -N -p`

            const latestInstanceTimeout = 24
            const latestInstance = exec(`${connectionToDb} --execute="SELECT creationTime FROM d_b_workspace_instance WHERE creationTime > DATE_SUB(NOW(), INTERVAL '${latestInstanceTimeout}' HOUR) LIMIT 1"`, { silent: true })

            const latestUserTimeout = 24
            const latestUser= exec(`${connectionToDb} --execute="SELECT creationDate FROM d_b_user WHERE creationDate > DATE_SUB(NOW(), INTERVAL '${latestUserTimeout}' HOUR) LIMIT 1"`, { silent: true })

            const lastModifiedTimeout = 24
            const lastModified= exec(`${connectionToDb} --execute="SELECT _lastModified FROM d_b_user WHERE _lastModified > DATE_SUB(NOW(), INTERVAL '${lastModifiedTimeout}' HOUR) LIMIT 1"`, { silent: true })

            const heartbeatTimeout = 24
            const heartbeat= exec(`${connectionToDb} --execute="SELECT lastSeen FROM d_b_workspace_instance_user WHERE lastSeen > DATE_SUB(NOW(), INTERVAL '${heartbeatTimeout}' HOUR) LIMIT 1"`, { silent: true })

            if ( (heartbeat.length      < 1) &&
                 (latestInstance.length < 1) &&
                 (latestUser.length     < 1) &&
                 (lastModified.length   < 1) ) {
                previewsToDelete.push(previewNS)
            }
        }
    }

}

function getAllBranches(): string[] {
    return exec(`git branch -r | grep -v '\\->' | sed "s,\\x1B\\[[0-9;]*[a-zA-Z],,g"`).stdout.trim().split('\n');
}

function expectedNamespaceFromBranch(branch: string): string {
    const previewName = previewNameFromBranchName(branch)
    return `staging-${previewName}`
}

function parseBranch(branch: string): string {
    return branch.normalize().split("/").join("-").replace('origin-','staging-').trim();
}
