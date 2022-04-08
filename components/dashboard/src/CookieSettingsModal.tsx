/**
 * Copyright (c) 2022 Gitpod GmbH. All rights reserved.
 * Licensed under the GNU Affero General Public License (AGPL).
 * See License-AGPL.txt in the project root for license information.
 */

import CheckBox from "./components/CheckBox";
import Modal from "./components/Modal";

function CookieSettingsModal(props: {
    showCookieSettings: boolean;
    cookiePreferences: { necessary: boolean; analytical: boolean; targeting: boolean };
    onClose: () => void;
    onSave: () => void;
    onAnalyticalCheckboxChange: () => void;
    onTargetingCheckboxChange: () => void;
}) {
    return (
        <Modal visible={props.showCookieSettings} onClose={() => props.onClose()}>
            <h3 className="mb-4">Cookie settings</h3>
            <div className="flex gap-2">
                <h4>Strictly necessary cookies</h4>
                <div className="-mt-4">
                    <CheckBox title="" desc={undefined} checked={true} disabled={true} name="necessary" />
                </div>
            </div>
            <p className="mb-4">
                These are cookies that are required for the operation of our Site and under our terms with you. They
                include, for example, cookies that enable you to log into secure areas of our Site or (on other sites)
                use a shopping cart or make use of e-billing services.
            </p>
            <div className="flex gap-2">
                <h4>Analytical / Performance cookies</h4>
                <div className="-mt-4">
                    <CheckBox
                        title=""
                        desc={undefined}
                        checked={props.cookiePreferences.analytical}
                        name="analytical"
                        onChange={(evt) => props.onAnalyticalCheckboxChange()}
                    />
                </div>
            </div>
            <p className="mb-4">
                These allow us to recognise and count the number of visitors and to see how visitors move around our
                site when they are using it. This helps us improve the way our Website works, for example, by ensuring
                that users are finding what they are looking for easily.
            </p>
            <div className="flex gap-2">
                <h4>Targeting/Advertising cookies</h4>
                <div className="-mt-4">
                    <CheckBox
                        title=""
                        desc={undefined}
                        checked={props.cookiePreferences.targeting}
                        name="targeting"
                        onChange={(evt) => props.onTargetingCheckboxChange()}
                    />
                </div>
            </div>
            <p className="mb-4">
                These cookies record your visit to our Website, the pages you have visited and the links you have
                followed. We will use this information subject to your choices and preferences to make our Website and
                the advertising displayed on it more relevant to your interests. We may also share this information with
                third parties for this purpose.
            </p>
            <button
                onClick={() => {
                    props.onSave();
                }}
            >
                Save
            </button>
        </Modal>
    );
}

export default CookieSettingsModal;
