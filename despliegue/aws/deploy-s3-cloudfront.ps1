param(
  [Parameter(Mandatory = $true)]
  [string]$BucketName,

  [Parameter(Mandatory = $true)]
  [string]$DistributionId,

  [string]$AwsProfile = "default",
  [string]$AwsRegion = "us-east-1"
)

$ErrorActionPreference = "Stop"

Write-Host "Building Angular (production)..." -ForegroundColor Cyan
npm.cmd run build

$distPath = Join-Path $PSScriptRoot "..\..\dist\frontend\browser"
$distPath = (Resolve-Path $distPath).Path

Write-Host "Syncing to S3 bucket: s3://$BucketName" -ForegroundColor Cyan
aws s3 sync $distPath "s3://$BucketName" --delete --profile $AwsProfile --region $AwsRegion

Write-Host "Creating CloudFront invalidation..." -ForegroundColor Cyan
aws cloudfront create-invalidation --distribution-id $DistributionId --paths "/*" --profile $AwsProfile --region $AwsRegion | Out-Null

Write-Host "Done. Frontend deployed." -ForegroundColor Green
