# AllenPlan

AllenPlan is a browser extension that scrapes data from sites like DARS, MyPlan, and the CSE Teaching Schedule to create more informed course plans for students.

By consolidating information from these sources, students will be able to conveniently make course plans with less risk of forgetting to consult a resource and making an suboptimal course plan, while saving time by not needing to rely on a potentially long process to schedule and attend advising appointments.

[Living Document](https://docs.google.com/document/d/1lcMlHKdeGeLQlEwwXSiABRWEiz8iWdu12LJ2YI6Aelk/edit?usp=sharing)

## Building and running tests
AllenPlan can be run directly from the files in this repository with no additional
build steps. Clone or download this repository and then follow the instructions
in the **Installation** section.

To run the automated test suite,
[install Node.js](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
and run `node --test` from this folder.

## Installation
As a Manifest V3 extension, it is possible to run AllenPlan in several browsers.
Only Chrome is officially supported; Firefox and Safari may work, but may
periodically be broken by new commits.

### Chrome

1. Open `chrome://extensions` in Chrome and enable **Developer mode**.
2. Click **Load unpacked** and select the `extension/` subdirectory of this repository.

### Firefox

1. Navigate to `about:debugging` > This Firefox
2. Click "Load Temporary Add-on" and select the `extension/manifest.json` file from this repository.

To update the extension after making changes, return to This Firefox and click the Reload button under
Temporary Extensions > AllenPlan.

### Safari

1. Enable developer mode via `Safari > Settings > Advanced > Show features for web developers`.
2. Enter the new `Developer` tab and enable `Allow unsigned extensions`.
3. Click `Add Temporary Extension` and select the `extension/` subdirectory of this repository.

To update the extension after making changes, go to the Extensions tab, select `AllenPlan` and press `Reload`.

## Usage

1. Select **Open DARS** on the Help page that opens on first install, or in the AllenPlan popup.
2. Sign in to MyPlan if prompted. Select Computer Science, Computer Science: Data Science, or Computer Engineering and open the completed audit.
3. With the audit open, click the AllenPlan extension icon and select **Import DARS**.
4. In the planner that opens, choose your preferences and select **Generate schedule**.
