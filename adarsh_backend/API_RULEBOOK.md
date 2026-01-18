# API Rule Book

This document outlines the API endpoints used in the application, including their methods, URLs, required parameters, and authentication details. All endpoints are prefixed with the `BASE_URL` (e.g., `http://localhost:8000`).

## Authentication
- All API calls require a JWT token in the `X-User` header unless specified otherwise.
- Token is obtained from the `jwtToken` input field in the frontend.

## Endpoints

### 1. Auth Test
- **Method**: GET
- **URL**: `/auth/me`
- **Headers**: `X-User: <token>`
- **Description**: Verifies the user's authentication status.
- **Response**: User details or error.

### 2. Upload Resume
- **Method**: POST
- **URL**: `/api/candidates/{candidateId}/resume`
- **Headers**: `Content-Type: application/json`, `X-User: <token>`
- **Body**: `{ "resume_text": "<resumeText>" }`
- **Description**: Uploads resume text for a candidate.
- **Requirements**: `candidateId` and `resumeText` must be provided.
- **Response**: Success or error status.

### 3. Get Candidate Status
- **Method**: GET
- **URL**: `/api/candidates/{candidateId}`
- **Headers**: `X-User: <token>`
- **Description**: Retrieves the status of a candidate.
- **Requirements**: `candidateId` must be provided.
- **Response**: Candidate details or error.

### 4. Submit Coding Round
- **Method**: POST
- **URL**: `/api/assessments/submit/{candidateId}/{roundIndex}`
- **Headers**: `Content-Type: application/json`, `X-User: <token>`
- **Body**: `{ "code": "<code>", "language": "<language>" }`
- **Description**: Submits code for a specific coding round.
- **Requirements**: `candidateId`, `roundIndex`, `code`, and `language` must be provided.
- **Response**: Submission result or error.

### 5. Get Decision
- **Method**: GET
- **URL**: `/decision/{candidateId}`
- **Headers**: `X-User: <token>`
- **Description**: Retrieves the decision for a candidate.
- **Requirements**: `candidateId` must be provided.
- **Response**: Decision details or error.

### 6. Get Decision Explanation
- **Method**: GET
- **URL**: `/decision/{candidateId}/explanation`
- **Headers**: `X-User: <token>`
- **Description**: Retrieves the explanation for the decision.
- **Requirements**: `candidateId` must be provided.
- **Response**: Explanation details or error.

### 7. Get Proctoring Logs
- **Method**: GET
- **URL**: `/proctoring/{candidateId}`
- **Headers**: `X-User: <token>`
- **Description**: Retrieves proctoring logs for a candidate.
- **Requirements**: `candidateId` must be provided.
- **Response**: Logs or error.

## General Rules
- All requests are made asynchronously using `fetch`.
- Responses include `status` and `data`.
- Handle network errors gracefully.
- Ensure all required fields are filled before making requests.