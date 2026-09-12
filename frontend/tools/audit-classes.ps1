$css = Get-Content "src\styles\design.css" -Raw
$used = @{}
Get-ChildItem -Recurse src -Include *.tsx,*.ts | ForEach-Object {
  $m = Select-String -Path $_.FullName -Pattern 'className="([^"]+)"' -AllMatches
  foreach ($mm in $m.Matches) {
    foreach ($c in ($mm.Groups[1].Value -split "\s+")) { $used[$c] = $true }
  }
}
$missing = @()
foreach ($c in $used.Keys | Sort-Object) {
  $found = $css -match ("\." + [regex]::Escape($c) + "([^a-zA-Z0-9_-]|$)")
  if (-not $found) { $missing += $c }
}
if ($missing.Count -eq 0) { "ALL CLASS NAMES PRESENT" } else { "MISSING:"; $missing }