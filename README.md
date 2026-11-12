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

### Safari

1. Enable developer mode via `Safari > Settings > Advanced > Show features for web developers`.
2. Enter the new `Developer` tab and enable `Allow unsigned extensions`.
3. Click `Add Temporary Extension` and select the `extensions` subdirectory of this repository.

To update the extension after making changes, go to the Extensions tab, select `AllenPlan` and press `Reload`.

## Usage

1. Install the extension as above
2. Click on the AllenPlan extension icon in the browser
3. Open the "Import DARS" tab and click the "Open DARS page" button
4. Log in with your UW account if necessary
5. Choose the "Computer Science" major option ("Computer Science: Data Science" and "Computer Engineering" not yet supported)
6. Click "Import" within the extension modal under the "Import DARS" tab
7. Choose your options under the "Generate Schedule" tab
8. Click "Generate Schedule" under the "Generate Schedule" tab
9. Profit
