let sessionPassword = '';

export function setSessionPassword(password: string) {
  sessionPassword = password;
}

export function getSessionPassword() {
  return sessionPassword;
}

export function clearSessionPassword() {
  sessionPassword = '';
}
