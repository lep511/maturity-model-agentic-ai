# Cognito Setup Guide

> **⚠️ DEPRECATED — This file is obsolete as of January 2025**
> 
> **Authentication has been removed from this application.**  
> The application now runs without any authentication requirements and is fully accessible to all users.  
> Session data is stored locally using browser localStorage and cookies.
> 
> This documentation is retained for historical reference only.

---

AWS CLI commands to create and configure a Cognito User Pool for the AWS Security Maturity Model Assessment Tool.

## Prerequisites

- AWS CLI installed and configured (`aws configure`)
- IAM permissions for Cognito operations

## 1. Create the User Pool

```bash
aws cognito-idp create-user-pool \
  --pool-name "MaturityModel-UserPool" \
  --auto-verified-attributes email \
  --username-attributes email \
  --policies '{
    "PasswordPolicy": {
      "MinimumLength": 8,
      "RequireUppercase": true,
      "RequireLowercase": true,
      "RequireNumbers": true,
      "RequireSymbols": false
    }
  }' \
  --schema '[
    {"Name":"email","Required":true,"Mutable":true,"AttributeDataType":"String"}
  ]' \
  --region us-east-1
```

Save the `UserPool.Id` from the response (e.g., `us-east-1_XXXXXXXXX`).

## 2. Configure the Hosted UI Domain

The app uses Cognito's Hosted UI for login. You need to assign a globally unique domain prefix to your User Pool. This prefix becomes part of the URL where users sign in.

The `--domain` value is a short, unique string you choose — it must be globally unique across all AWS accounts (similar to an S3 bucket name). It can only contain lowercase letters, numbers, and hyphens.

```bash
aws cognito-idp create-user-pool-domain \
  --user-pool-id <YOUR_POOL_ID> \
  --domain "maturity-model-prod" \
  --region us-east-1
```

In this example, `maturity-model-prod` is the prefix. If it's already taken by another AWS account, the command will fail and you must choose a different one (e.g., `maturity-model-mycompany`, `awsmm-dev`, etc.).

This produces the domain URL:
```
https://<domain-prefix>.auth.<region>.amazoncognito.com
```

For example: `https://us-east-1tmy15xxkv.auth.us-east-1.amazoncognito.com`

### Retrieving an existing domain

If you already created the domain and need to look it up:

```bash
aws cognito-idp describe-user-pool \
  --user-pool-id <YOUR_POOL_ID> \
  --region us-east-1 \
  --query 'UserPool.Domain' \
  --output text
```

This returns the prefix (e.g., `us-east-1tmy15xxkv`). The full URL is:
```
https://<returned-prefix>.auth.us-east-1.amazoncognito.com
```

You can also find it in the AWS Console under **Cognito → User Pools → your pool → App integration → Domain name**.

## 3. Create the App Client

The client must be created **without a secret** (`--no-generate-secret`) since the SDK runs in the browser/WebView and cannot securely store a client secret.

```bash
aws cognito-idp create-user-pool-client \
  --user-pool-id <YOUR_POOL_ID> \
  --client-name "MaturityModel-App" \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_SRP_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --supported-identity-providers COGNITO \
  --allowed-o-auth-flows code \
  --allowed-o-auth-scopes phone openid email \
  --allowed-o-auth-flows-user-pool-client \
  --callback-urls '["https://aws-maturity-model.vercel.app","com.lep511.maturitymodel://callback"]' \
  --logout-urls '["https://aws-maturity-model.vercel.app"]' \
  --prevent-user-existence-errors ENABLED \
  --region us-east-1
```

Save the `UserPoolClient.ClientId` from the response.

> **Note:** The logout URL must be HTTPS — Cognito rejects custom URI schemes for sign-out redirects. Both platforms sign out through the Vercel URL.

## 4. Create Users

```bash
aws cognito-idp admin-create-user \
  --user-pool-id <YOUR_POOL_ID> \
  --username "user@example.com" \
  --temporary-password "TempPass123" \
  --user-attributes Name=email,Value=user@example.com Name=email_verified,Value=true \
  --region us-east-1
```

The user will be in `FORCE_CHANGE_PASSWORD` state. On first login via the Hosted UI, Cognito automatically presents the "Set your new password" form.

### Optional: Set a permanent password directly

```bash
aws cognito-idp admin-set-user-password \
  --user-pool-id <YOUR_POOL_ID> \
  --username "user@example.com" \
  --password "PermanentPass123" \
  --permanent \
  --region us-east-1
```

## 5. Update the App Configuration

Edit `js/cognito-config.js`:

```javascript
const COGNITO_CONFIG = {
  domain:      'https://your-app-prefix.auth.us-east-1.amazoncognito.com', // from step 2
  clientId:    'xxxxxxxxxxxxxxxxxxxxxxxxxx',                                // from step 3
  redirectUri: IS_NATIVE
    ? 'com.lep511.maturitymodel://callback'
    : 'https://aws-maturity-model.vercel.app',
  scopes:      'phone openid email',
};
```

If running on Android, sync after editing:

```bash
npx cap sync android
```

## Authentication Flows

| Flow | Purpose |
|------|---------|
| `code` (OAuth2) | Primary login — Authorization Code with PKCE via Hosted UI |
| `ALLOW_USER_SRP_AUTH` | Secure Remote Password (used internally by Cognito) |
| `ALLOW_REFRESH_TOKEN_AUTH` | Silent token refresh — keeps users signed in |

### PKCE Flow (Web)

1. App generates a `code_verifier` + `code_challenge` (S256)
2. Redirects to Cognito Hosted UI with the challenge
3. User authenticates → Cognito redirects back with `?code=`
4. App exchanges the code + verifier for tokens
5. Tokens saved to localStorage → app initializes

### PKCE Flow (Android / Capacitor)

1. App opens Cognito Hosted UI in an in-app WebView (`@capacitor/browser`)
2. User authenticates → Cognito redirects to `com.lep511.maturitymodel://callback?code=`
3. Android intercepts the custom scheme → fires `appUrlOpen` event (`@capacitor/app`)
4. Listener exchanges the code for tokens → app continues

## Callback URLs Reference

| Platform | Callback URL | Sign-out URL |
|----------|-------------|--------------|
| Web (Vercel) | `https://aws-maturity-model.vercel.app` | `https://aws-maturity-model.vercel.app` |
| Android (Capacitor) | `com.lep511.maturitymodel://callback` | N/A (uses web URL) |

## Useful Management Commands

```bash
# List users
aws cognito-idp list-users \
  --user-pool-id <YOUR_POOL_ID> \
  --region us-east-1

# Disable a user
aws cognito-idp admin-disable-user \
  --user-pool-id <YOUR_POOL_ID> \
  --username "user@example.com" \
  --region us-east-1

# Delete a user
aws cognito-idp admin-delete-user \
  --user-pool-id <YOUR_POOL_ID> \
  --username "user@example.com" \
  --region us-east-1

# Reset a user's password
aws cognito-idp admin-reset-user-password \
  --user-pool-id <YOUR_POOL_ID> \
  --username "user@example.com" \
  --region us-east-1

# Describe the app client (verify settings)
aws cognito-idp describe-user-pool-client \
  --user-pool-id <YOUR_POOL_ID> \
  --client-id <YOUR_CLIENT_ID> \
  --region us-east-1
```

## Disabling Authentication

To run the app without Cognito, remove these `<script>` tags from `index.html`:

```html
<script src="js/cognito-config.js"></script>
<script src="js/auth.js"></script>
```

The app will function normally — the `AUTH` global won't exist and sign-out buttons won't render.

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `NotAuthorizedException` | Wrong credentials | Verify email and password |
| `UserNotFoundException` | User doesn't exist | Create with `admin-create-user` |
| `USER_SRP_AUTH is not enabled` | Auth flow not configured | Recreate client with correct `--explicit-auth-flows` |
| `Unable to verify secret hash` | Client created with a secret | Recreate client with `--no-generate-secret` |
| `redirect_mismatch` | Callback URL not registered | Add URL to `--callback-urls` in the app client |
| `PKCE verifier not found` | Session expired or cleared | User must restart the login flow |
| `invalid_grant` | Code already used or expired | Redirect user to login again |
