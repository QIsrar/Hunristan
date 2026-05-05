# Set Vercel environment variables
$env_vars = @{
    "SMTP_USER" = "qisrar951@gmail.com"
    "SMTP_PASS" = "xknuyegfwprtsvjj"
    "NEXT_PUBLIC_APP_URL" = "https://hunristan.vercel.app"
    "NEXT_PUBLIC_SITE_URL" = "https://hunristan.vercel.app"
}

foreach ($key in $env_vars.Keys) {
    $value = $env_vars[$key]
    Write-Host "Setting $key..."
    & vercel env rm $key production --yes 2>$null
    & echo $value | vercel env add $key production
}

Write-Host "Environment variables updated!"
