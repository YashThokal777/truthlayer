# Changelog

## [2.0.0] - 2026-10-01

### Changed

- Increased the API rate limit from 100 to 200 requests per minute.
- The Free plan project limit changed from 10 to 5 projects.
- Pro plan price changed from $29 to $39 per month.
- Deprecated `POST /v1/exports`. Use `POST /v1/exports/jobs` instead.

### Removed

- Removed `GET /v1/reports`. Use exports instead.

## [1.4.0] - 2026-06-02

### Added

- Exports now support CSV, PDF and Excel.
- New `GET /v1/users/{userId}` endpoint.
