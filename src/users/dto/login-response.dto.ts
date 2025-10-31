/**
 * Shared DTO for login responses across the application
 * Consolidates LoginResponse type definition
 */
export interface LoginResponse {
  id: string;
  token: string;
  refreshToken: string;
  userName: string;
  email: string;
  userType: string;
  phoneNumber: string;
  profilePic?: string;
}
