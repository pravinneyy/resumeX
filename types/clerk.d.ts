declare global {
    interface CustomJwtSessionClaims {
      metadata: {
        role?: "recruiter" | "candidate";
      };
    }
  }