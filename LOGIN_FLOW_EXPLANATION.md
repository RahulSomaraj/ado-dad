# Login Flow Explanation

## Endpoint: `POST /auth/login`

### Flow Diagram

```
Client Request
    ↓
[app.controller.ts] @Post('auth/login')
    ↓
@UseGuards(LocalAuthGuard)
    ↓
[local-auth-guard.ts] LocalAuthGuard
    ↓ (uses Passport 'local' strategy)
[local-strategy.ts] LocalStrategy.validate()
    ↓
[auth.service.ts] AuthService.validateUser(username, password)
    ↓
[users collection] MongoDB query to find user
    ↓
Password validation (bcrypt.compare)
    ↓
If valid: User attached to req.user
    ↓ (if invalid: throws 401 Unauthorized)
[app.controller.ts] login() method executes
    ↓
Extracts user from req.user
    ↓
[app.service.ts] AppService.login(userLoginDto, user)
    ↓
1. Generate access token (JWT)
2. Generate refresh token (JWT)
3. Save refresh token to database
4. Return LoginResponse
    ↓
Response to Client
```

---

## Step-by-Step Flow

### 1. **Controller Entry Point** (`src/app.controller.ts:300-309`)

```typescript
@UseGuards(LocalAuthGuard)  // ← Authentication guard
@Post('auth/login')
login(
  @Body() userLoginDto: LoginUserDto,  // ← Request body: { username, password }
  @Request() req,
): Promise<LoginResponse> {
  const user = req.user;  // ← User already validated by LocalAuthGuard
  return this.appService.login(userLoginDto, user);
}
```

**What happens:**
- Client sends POST request with `{ username: string, password: string }`
- `LocalAuthGuard` intercepts the request BEFORE the method executes
- If authentication fails, the method never runs (401 Unauthorized returned)

---

### 2. **LocalAuthGuard** (`src/auth/guard/local-auth-guard.ts`)

```typescript
export class LocalAuthGuard extends AuthGuard('local') {}
```

**What happens:**
- Extends Passport's `AuthGuard` with 'local' strategy
- Automatically calls the 'local' Passport strategy
- If validation succeeds, attaches user to `req.user`
- If validation fails, throws 401 Unauthorized

---

### 3. **LocalStrategy** (`src/auth/passport-strategies/local-strategy.ts`)

```typescript
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'username',  // ← Maps to LoginUserDto.username
      passwordField: 'password',  // ← Maps to LoginUserDto.password
    });
  }

  async validate(username: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(username, password);
    
    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.UNAUTHORIZED,
          error: 'Invalid username or password',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
    
    return user;  // ← This becomes req.user
  }
}
```

**What happens:**
- Passport extracts `username` and `password` from request body
- Calls `AuthService.validateUser(username, password)`
- If user is found and password is valid, returns user object
- If not, throws 401 Unauthorized

---

### 4. **AuthService.validateUser** (`src/auth/auth.service.ts:32-80`)

```typescript
async validateUser(
  username: string,
  password: string,
): Promise<UserValidationResult | null> {
  // 1. Input validation
  if (!this.isValidInput(username) || !this.isValidInput(password)) {
    return null;
  }

  // 2. Find user by credentials (email, phone, etc.)
  const user = await this.findUserByCredentials(username.trim());

  if (!user) {
    return null;  // User not found
  }

  // 3. Check if user is deleted
  if (user.isDeleted) {
    return null;
  }

  // 4. Validate password
  const isPasswordValid = await this.validatePassword(password, user);
  if (!isPasswordValid) {
    return null;  // Invalid password
  }

  // 5. Return sanitized user data
  return this.sanitizeUserData(user);
}
```

**Key Methods:**
- `findUserByCredentials()`: Searches by email OR phone number (with country code)
- `validatePassword()`: Uses bcrypt to compare hashed password
- `sanitizeUserData()`: Removes sensitive fields (password, otp, etc.)

**What happens:**
- Searches for user by email or phone number (with country code)
- Validates password using bcrypt
- Returns user data (without password) if valid
- Returns null if invalid (which triggers 401)

---

### 5. **AppService.login** (`src/app.service.ts:41-91`)

```typescript
async login(userLoginDto: LoginUserDto, user: User): Promise<LoginResponse> {
  // 1. Create token payload
  const tokenPayload: TokenPayload = {
    id: user._id?.toString() || '',
    email: user.email,
    userType: user.type,
  };

  // 2. Generate both tokens in parallel
  const [accessToken, refreshToken] = await Promise.all([
    this.generateAccessToken(tokenPayload),
    this.generateRefreshToken(tokenPayload),
  ]);

  // 3. Extract 'iat' (issued at) from refresh token
  const { iat } = await this.jwtService.verify(refreshToken, {
    secret: this.configService.get('TOKEN_KEY'),
  });

  // 4. Save refresh token to database
  await this.saveRefreshToken(
    user._id?.toString() || '',
    refreshToken,
    iat,
  );

  // 5. Return login response
  return {
    id: user._id?.toString() || '',
    token: `Bearer ${accessToken}`,  // ← Access token (short-lived)
    refreshToken,                     // ← Refresh token (long-lived)
    userName: user.name,
    email: user.email,
    userType: user.type,
    countryCode: user.countryCode || '+91',
    phoneNumber: user.phoneNumber,
    profilePic: user.profilePic,
  };
}
```

**What happens:**
- Creates JWT payload with user ID, email, and user type
- Generates access token (short-lived, for API requests)
- Generates refresh token (long-lived, for getting new access tokens)
- Saves refresh token to `auth_tokens` collection
- Returns complete login response with tokens and user info

---

## Request/Response Format

### Request
```json
POST /auth/login
Content-Type: application/json

{
  "username": "+919876543210",  // Can be email, phone, or name
  "password": "userPassword123"
}
```

### Response (Success - 200)
```json
{
  "id": "507f1f77bcf86cd799439011",
  "token": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userName": "John Doe",
  "email": "john@example.com",
  "userType": "USER",
  "countryCode": "+91",
  "phoneNumber": "9876543210",
  "profilePic": "https://example.com/profile.jpg"
}
```

### Response (Failure - 401)
```json
{
  "statusCode": 401,
  "error": "Invalid username or password"
}
```

---

## Key Points

1. **Authentication happens BEFORE the controller method**
   - `LocalAuthGuard` validates credentials first
   - Only if valid, `req.user` is populated and method executes

2. **Username can be email OR phone number**
   - `findUserByCredentials()` handles both
   - Phone numbers should include country code (e.g., "+919876543210")

3. **Two tokens are generated:**
   - **Access Token**: Short-lived, used for API authentication
   - **Refresh Token**: Long-lived, used to get new access tokens

4. **Refresh tokens are stored in database**
   - Stored in `auth_tokens` collection
   - Allows token revocation and session management

5. **Password is never returned**
   - Only hashed password is stored
   - Password is validated but not included in response

---

## Error Scenarios

| Scenario | Status Code | Error Message |
|----------|-------------|---------------|
| User not found | 401 | "Invalid username or password" |
| Wrong password | 401 | "Invalid username or password" |
| User deleted | 401 | "Invalid username or password" |
| Missing username/password | 401 | "Invalid username or password" |
| Token generation failure | 500 | "Authentication failed" |
| Database error | 500 | "Authentication failed" |

---

## Dependencies

- **LocalAuthGuard** → Uses Passport 'local' strategy
- **LocalStrategy** → Uses **AuthService**
- **AuthService** → Uses **UserModel** (MongoDB)
- **AppService** → Uses **JwtService**, **AuthTokenModel** (MongoDB)

---

## Security Features

1. ✅ Passwords are hashed (bcrypt)
2. ✅ Passwords never returned in response
3. ✅ Refresh tokens stored securely in database
4. ✅ Tokens contain minimal user information
5. ✅ Invalid credentials return generic error (no user enumeration)
6. ✅ Deleted users cannot login
7. ✅ Input validation on username/password
