$MFA_SERIAL = "arn:aws:iam::211125488712:mfa/MotoG24"
$DURATION   = 129600
$ENV_FILE   = "$PSScriptRoot\.env"

# ── Load .env ─────────────────────────────────────────────────────────────────

$envVars = @{}
Get-Content $ENV_FILE | Where-Object { $_ -match '^\s*[^#].+=.' } | ForEach-Object {
    $parts = $_ -split '=', 2
    $envVars[$parts[0].Trim()] = $parts[1].Trim().Trim('"')
}

$JENKINS_URL   = $envVars["JENKINS_URL"]
$JENKINS_USER  = $envVars["JENKINS_USER"]
$JENKINS_TOKEN = $envVars["JENKINS_TOKEN"]

# ── Step 1: Refresh AWS credentials ──────────────────────────────────────────

$tokenCode = Read-Host "Enter MFA token code"

$response = aws sts get-session-token `
    --serial-number $MFA_SERIAL `
    --token-code $tokenCode `
    --duration-seconds $DURATION | ConvertFrom-Json

if (-not $response) {
    Write-Error "Failed to get session token. Check your MFA code and AWS CLI config."
    exit 1
}

$creds = $response.Credentials

# ── Step 2: Update .env ───────────────────────────────────────────────────────

$content = Get-Content $ENV_FILE -Raw

$content = $content -replace '(?m)^AWS_ACCESS_KEY_ID=.*$',    "AWS_ACCESS_KEY_ID=`"$($creds.AccessKeyId)`""
$content = $content -replace '(?m)^AWS_SECRET_ACCESS_KEY=.*$', "AWS_SECRET_ACCESS_KEY=`"$($creds.SecretAccessKey)`""

if ($content -match '(?m)^AWS_SESSION_TOKEN=') {
    $content = $content -replace '(?m)^AWS_SESSION_TOKEN=.*$', "AWS_SESSION_TOKEN=`"$($creds.SessionToken)`""
} else {
    $content = $content -replace '(?m)^(AWS_SECRET_ACCESS_KEY=.*)$', "`$1`nAWS_SESSION_TOKEN=`"$($creds.SessionToken)`""
}

Set-Content $ENV_FILE $content -NoNewline
Write-Host ".env updated. Expires: $($creds.Expiration)"

# ── Step 3: Push credentials to Jenkins ──────────────────────────────────────

$base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${JENKINS_USER}:${JENKINS_TOKEN}"))
$authHeader = @{ Authorization = "Basic $base64Auth" }

try {
    $crumbResponse = Invoke-RestMethod "$JENKINS_URL/crumbIssuer/api/json" -Headers $authHeader
    $authHeader[$crumbResponse.crumbRequestField] = $crumbResponse.crumb
} catch {
    Write-Warning "Could not fetch Jenkins crumb - CSRF may be disabled, continuing anyway."
}

$credentialsToUpdate = @(
    @{ id = "aws-access-key-id";     value = $creds.AccessKeyId },
    @{ id = "aws-secret-access-key"; value = $creds.SecretAccessKey },
    @{ id = "aws-session-token";     value = $creds.SessionToken }
)

foreach ($cred in $credentialsToUpdate) {
    $xml = "<org.jenkinsci.plugins.plaincredentials.impl.StringCredentialsImpl>" +
           "<scope>GLOBAL</scope>" +
           "<id>" + $cred.id + "</id>" +
           "<description></description>" +
           "<secret>" + $cred.value + "</secret>" +
           "</org.jenkinsci.plugins.plaincredentials.impl.StringCredentialsImpl>"

    $uri = "$JENKINS_URL/credentials/store/system/domain/_/credential/$($cred.id)/config.xml"
    try {
        Invoke-RestMethod -Uri $uri -Method Post -Headers $authHeader -ContentType "application/xml" -Body $xml | Out-Null
        Write-Host "Jenkins updated: $($cred.id)"
    } catch {
        Write-Warning "Failed to update Jenkins credential '$($cred.id)': $_"
    }
}

Write-Host "Done. AWS credentials refreshed in .env and Jenkins."
