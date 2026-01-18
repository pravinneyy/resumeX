// ===============================
// CONFIG
// ===============================
const BASE_URL = "http://localhost:8000";

// ===============================
// HELPERS
// ===============================
async function apiCall(url, method = "GET", body = null, token = null) {
  try {
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "X-User": token } : {})
      },
      body: body ? JSON.stringify(body) : null
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = { detail: "No JSON response" };
    }

    return {
      status: res.status,
      data
    };
  } catch (err) {
    return {
      status: "NETWORK_ERROR",
      data: { error: err.message }
    };
  }
}

function showResult(elementId, result) {
  document.getElementById(elementId).textContent =
    JSON.stringify(result, null, 2);
}

// ===============================
// SECTION 1: AUTH TEST
// ===============================
async function testAuth() {
  const token = document.getElementById("jwtToken").value;

  const result = await apiCall(
    `${BASE_URL}/auth/me`,
    "GET",
    null,
    token
  );

  showResult("authResult", result);
}

// ===============================
// SECTION 2: CREATE CANDIDATE
// ===============================
async function createCandidate() {
  const name = document.getElementById("candidateName").value;
  const email = document.getElementById("candidateEmail").value;
  const phone = document.getElementById("candidatePhone").value;
  const blueprintId = document.getElementById("blueprintId").value;
  const token = document.getElementById("jwtToken").value;

  if (!name || !email || !phone || !blueprintId) {
    alert("Name, Email, Phone, and Blueprint ID are required");
    return;
  }

  const result = await apiCall(
    `${BASE_URL}/api/candidates`,
    "POST",
    { name, email, phone, blueprint_id: blueprintId },
    token
  );

  showResult("createResult", result);
}

// ===============================
// SECTION 3: CANDIDATE FLOW
// ===============================
async function uploadResume() {
  const candidateId = document.getElementById("candidateIdCandidate").value;
  const resumeText = document.getElementById("resumeText").value;
  const token = document.getElementById("jwtToken").value;

  if (!candidateId || !resumeText) {
    alert("Candidate ID and Resume Text required");
    return;
  }

  const result = await apiCall(
    `${BASE_URL}/api/candidates/${candidateId}/resume`,
    "POST",
    { resume_text: resumeText },
    token
  );

  showResult("candidateResult", result);
}

async function getCandidateStatus() {
  const candidateId = document.getElementById("candidateIdCandidate").value;
  const token = document.getElementById("jwtToken").value;

  if (!candidateId) {
    alert("Candidate ID required");
    return;
  }

  const result = await apiCall(
    `${BASE_URL}/api/candidates/${candidateId}`,
    "GET",
    null,
    token
  );

  showResult("candidateResult", result);
}

// ===============================
// SECTION 4: CODING ROUND
// ===============================
async function submitCodingRound() {
  const candidateId = document.getElementById("candidateIdCoding").value;
  const roundIndex = document.getElementById("roundIndex").value;
  const code = document.getElementById("code").value;
  const language = document.getElementById("language").value;
  const token = document.getElementById("jwtToken").value;

  if (!candidateId || roundIndex === "" || !code || !language) {
    alert("Candidate ID, Round Index, Code, and Language are required");
    return;
  }

  const result = await apiCall(
    `${BASE_URL}/api/assessments/submit/${candidateId}/${roundIndex}`,
    "POST",
    {
      code: code,
      language: language
    },
    token
  );

  showResult("codingResult", result);
}

// ===============================
// SECTION 5: HR / DECISION
// ===============================
async function getDecision() {
  const candidateId = document.getElementById("candidateIdHr").value;
  const token = document.getElementById("jwtToken").value;

  if (!candidateId) {
    alert("Candidate ID required");
    return;
  }

  const result = await apiCall(
    `${BASE_URL}/decision/${candidateId}`,
    "GET",
    null,
    token
  );

  showResult("hrResult", result);
}

async function getDecisionExplanation() {
  const candidateId = document.getElementById("candidateIdHr").value;
  const token = document.getElementById("jwtToken").value;

  const result = await apiCall(
    `${BASE_URL}/decision/${candidateId}/explanation`,
    "GET",
    null,
    token
  );

  showResult("hrResult", result);
}

async function getProctoringLogs() {
  const candidateId = document.getElementById("candidateIdHr").value;
  const token = document.getElementById("jwtToken").value;

  const result = await apiCall(
    `${BASE_URL}/proctoring/${candidateId}`,
    "GET",
    null,
    token
  );

  showResult("hrResult", result);
}
