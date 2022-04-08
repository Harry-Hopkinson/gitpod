/**
 * Copyright (c) 2022 Gitpod GmbH. All rights reserved.
 * Licensed under the GNU Affero General Public License (AGPL).
 * See License-AGPL.txt in the project root for license information.
 */

function CookieBanner(props: {
    onOpenCookieSettings: () => void;
    onAcceptAllCookies: () => void;
    onRejectAllCookies: () => void;
}) {
    return (
        <div className="flex justify-between items-center mx-auto h-12 px-4 py-2 text-center text-xs text-gray-600 bg-sand-dark w-full bottom-0 left-0 fixed">
            <p className="text-gray-600">
                The website uses cookies to enhance the user experience. Read our{" "}
                <a
                    className="gp-link hover:text-gray-600"
                    target="gitpod-privacy"
                    href="https://www.gitpod.io/privacy/"
                >
                    privacy policy{" "}
                </a>
                for more info.
            </p>
            <div className="flex gap-1">
                <button
                    className="py-3 bg-sand-dark underline text-xs text-gray-400 hover:text-gray-600"
                    onClick={() => props.onOpenCookieSettings()}
                >
                    Modify settings
                </button>
                <button
                    className="bg-off-white rounded-lg hover:bg-white text-xs text-gray-600"
                    onClick={() => props.onAcceptAllCookies()}
                >
                    Accept Cookies
                </button>
                <button
                    className="bg-off-white rounded-lg hover:bg-white text-xs text-gray-600"
                    onClick={() => props.onRejectAllCookies()}
                >
                    Reject All
                </button>
            </div>
        </div>
    );
}

export default CookieBanner;
