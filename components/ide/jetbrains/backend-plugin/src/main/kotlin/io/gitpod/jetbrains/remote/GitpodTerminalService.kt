// Copyright (c) 2022 Gitpod GmbH. All rights reserved.
// Licensed under the GNU Affero General Public License (AGPL).
// See License-AGPL.txt in the project root for license information.

package io.gitpod.jetbrains.remote

import com.intellij.openapi.Disposable
import com.intellij.openapi.application.runInEdt
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindowManager
import com.intellij.openapi.wm.ex.ToolWindowManagerListener
import com.intellij.remoteDev.util.onTerminationOrNow
import com.intellij.util.application
import com.jetbrains.rd.util.lifetime.Lifetime
import com.jetbrains.rdserver.terminal.BackendTerminalManager
import io.gitpod.jetbrains.remote.utils.Retrier.retry
import io.gitpod.supervisor.api.Status.*
import io.gitpod.supervisor.api.StatusServiceGrpc
import io.gitpod.supervisor.api.TerminalOuterClass
import io.gitpod.supervisor.api.TerminalServiceGrpc
import io.grpc.stub.ClientCallStreamObserver
import io.grpc.stub.ClientResponseObserver
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.DelicateCoroutinesApi
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.future.await
import kotlinx.coroutines.guava.asDeferred
import kotlinx.coroutines.launch
import org.jetbrains.plugins.terminal.TerminalToolWindowFactory
import org.jetbrains.plugins.terminal.TerminalView
import java.util.concurrent.CompletableFuture

@Suppress("UnstableApiUsage", "EXPERIMENTAL_IS_NOT_ENABLED", "OPT_IN_IS_NOT_ENABLED")
@OptIn(DelicateCoroutinesApi::class)
class GitpodTerminalService(private val project: Project) : Disposable {
    private val lifetime = Lifetime.Eternal.createNested()
    private val terminalView = TerminalView.getInstance(project)
    private val terminalServiceFutureStub = TerminalServiceGrpc.newFutureStub(GitpodManager.supervisorChannel)
    private val statusServiceStub = StatusServiceGrpc.newStub(GitpodManager.supervisorChannel)
    private val backendTerminalManager = BackendTerminalManager.getInstance(project)

    override fun dispose() {
        lifetime.terminate()
    }

    init {
        if (!application.isHeadlessEnvironment) {
            launch()
        }
    }

    private fun launch() = GlobalScope.launch {
        retry(3) { getTerminalToolWindowRegisteredEvent().await() }
        val tasks = retry(3) { getSupervisorTasksList().await() }
        val terminals = retry(3) { getSupervisorTerminalsListAsync().await().terminalsList }
        debug("Got a list of Supervisor terminals: $terminals")
        connectTasksToTerminals(tasks, terminals)
    }

    private fun connectTasksToTerminals(
            tasks: List<TaskStatus>,
            terminals: MutableList<TerminalOuterClass.Terminal>
    ) = runInEdt {
            if (tasks.isEmpty()) {
                backendTerminalManager.createNewSharedTerminal("Gitpod", "Terminal")
            } else {
                val aliasToTerminalMap: MutableMap<String, TerminalOuterClass.Terminal> = mutableMapOf()

                for (terminal in terminals) {
                    val terminalAlias = terminal.alias
                    aliasToTerminalMap[terminalAlias] = terminal
                }

                for (task in tasks) {
                    val terminalAlias = task.terminal
                    val terminal = aliasToTerminalMap[terminalAlias]

                    if (terminal != null) {
                        createSharedTerminal(terminal)
                    }
                }
            }
        }

    private fun getTerminalToolWindowRegisteredEvent(): CompletableFuture<Void> {
        val completableFuture = CompletableFuture<Void>()

        val messageBusConnection = project.messageBus.connect()

        debug("Waiting for TerminalToolWindow to be registered...")
        val toolWindowManagerListener = object : ToolWindowManagerListener {
            override fun toolWindowsRegistered(ids: MutableList<String>, toolWindowManager: ToolWindowManager) {
                if (ids.contains(TerminalToolWindowFactory.TOOL_WINDOW_ID)) {
                    debug("TerminalToolWindow got registered!")
                    completableFuture.complete(null)
                    messageBusConnection.disconnect()
                }
            }
        }

        messageBusConnection.subscribe(ToolWindowManagerListener.TOPIC, toolWindowManagerListener)

        return completableFuture
    }

    private fun getSupervisorTasksList(): CompletableFuture<List<TaskStatus>> {
        val completableFuture = CompletableFuture<List<TaskStatus>>()
        val taskStatusRequest = TasksStatusRequest.newBuilder().setObserve(true).build()
        val taskStatusResponseObserver = object : ClientResponseObserver<TasksStatusRequest, TasksStatusResponse> {
            override fun beforeStart(request: ClientCallStreamObserver<TasksStatusRequest>) {
                lifetime.onTerminationOrNow {
                    request.cancel(null, null)
                }
            }

            override fun onNext(response: TasksStatusResponse) {
                debug("Received task list: ${response.tasksList}")

                for (task in response.tasksList) {
                    if (task.state === TaskState.opening) {
                        return
                    }
                }

                this.onCompleted()
                completableFuture.complete(response.tasksList)
            }

            override fun onCompleted() {
                debug("Successfully fetched tasks from Supervisor.")
            }

            override fun onError(throwable: Throwable) {
                thisLogger().error("Got an error while trying to fetch tasks from Supervisor.", throwable)
                completableFuture.completeExceptionally(throwable)
            }
        }

        statusServiceStub.tasksStatus(taskStatusRequest, taskStatusResponseObserver)

        return completableFuture
    }

    private fun getSupervisorTerminalsListAsync(): Deferred<TerminalOuterClass.ListTerminalsResponse> {
        val listTerminalsRequest = TerminalOuterClass.ListTerminalsRequest.newBuilder().build()
        return terminalServiceFutureStub.list(listTerminalsRequest).asDeferred()
    }

    private fun createSharedTerminal(supervisorTerminal: TerminalOuterClass.Terminal) {
        debug("Creating shared terminal '${supervisorTerminal.title}' on Backend IDE")

        val shellTerminalWidget = terminalView.createLocalShellWidget(project.basePath, supervisorTerminal.title)

        backendTerminalManager.shareTerminal(shellTerminalWidget, supervisorTerminal.alias)

        shellTerminalWidget.executeCommand("gp tasks attach ${supervisorTerminal.alias}")
    }

    private fun debug(message: String) = runInEdt {
        if (System.getenv("JB_DEV").toBoolean()) {
            thisLogger().warn(message)
        } else {
            thisLogger().info(message)
        }
    }
}
