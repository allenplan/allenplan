# AllenPlan UI plan

The tab-free popup manages the DARS audit. The planner page holds the schedule preferences and results. **Open planner** opens or focuses that page. **Generate schedule** calculates a plan from the user's choices.

## Popup actions

| Saved audit | Active page | Primary action | Other actions besides Help |
| --- | --- | --- | --- |
| No | DARS | Import DARS | — |
| No | Any other page, including the planner | Open DARS | — |
| Yes | DARS | Reimport DARS | Open planner, Delete imported audit |
| Yes | Planner | Open DARS | Delete imported audit |
| Yes | Any other page | Open planner | Open DARS, Delete imported audit |

Keep the buttons short. Beneath import, show the full major name and “Opens planner.” Beneath **Open planner**, show the saved audit’s full major name and the local date and time of import, to the minute.

Read the major from the degree heading on the open DARS audit. Enable the import or reimport action for Computer Science (CS), Computer Science: Data Science (CS:DS), or Computer Engineering (CE). Show the detected major beside the action. For a missing or unsupported major, disable the action and explain which audit to open.

After a successful import or reimport, open or focus the planner. A failed reimport keeps the previous audit available and shows the reason in the popup.

## Planner

- Save edits to the CS course limit, desired courses, start quarter, and start year as the user makes them. Restore them when the planner reopens.
- **Reset to defaults** restores and saves the form’s default preferences. Choose **Generate schedule** to apply them to a new schedule.
- After import or reimport, show the preferences. Reveal results when the user chooses **Generate schedule**. Subsequent generations update the same page.
- **Delete imported audit** clears the audit and its displayed results while preserving preferences. An open planner immediately disables **Generate schedule**, explains that an audit is required, and offers **Open DARS**.

## Help

Open Help automatically on first install. Its primary action is **Open DARS**. Explain how to select the major in MyPlan, open the completed audit, and reopen AllenPlan to import it. Show **Help** in every popup state except when Help is the active page.
