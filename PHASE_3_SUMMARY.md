# Phase 3 Summary — Academic System 2.0

## Baseline

Phase 3 was developed from `LifeOS-Web-Phase-2-CRUD.zip`. The existing interface direction, navigation, storage key, Phase 2 CRUD modules and user data compatibility were preserved.

## Academic Data Model

### Course

Each course can now store:

- ID
- Course code
- Course title
- Credit
- Grade
- Course type
- Instructor
- Section
- Completion status
- Retake/replacement identity
- CGPA inclusion/exclusion flag
- Created and updated timestamps

### Semester

Each saved semester can now store:

- Name
- Term
- Year
- Status
- Start date
- End date
- GPA
- Counted credits
- Quality points
- Saved date
- Full course snapshot
- Created and updated timestamps

### Academic Settings

A versioned settings record stores:

- Scale name
- Custom grading scale
- Retake policy
- Target CGPA
- Planned target credits
- Total program credits

## User-Facing Features

1. Current semester course add/edit/delete workflow.
2. Semester metadata and save validation.
3. Saved semester details, editing and deletion.
4. Automatic GPA recalculation after semester edits.
5. Overall CGPA from individual course attempts.
6. Latest-attempt replacement or all-attempt retake policy.
7. Custom grading scale with safe recalculation.
8. Per-course CGPA inclusion/exclusion.
9. Target CGPA planner.
10. Projected CGPA with the current semester draft.
11. Degree progress and remaining credits.
12. Saved grade distribution.
13. Expanded printable academic report.
14. Shared academic calculations across Dashboard, Analytics, Achievements and Reports.

## Deferred

The following remain planned for later phases:

- Attendance tracking
- University policy presets
- Transcript import
- Cloud authentication and synchronization
- Native notifications
- Flutter mobile application
