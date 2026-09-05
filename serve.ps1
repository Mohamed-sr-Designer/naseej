$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://localhost:4900/')
$listener.Start()
Write-Host "NASIJ server running at http://localhost:4900/"

while ($true) {
    $ctx = $listener.GetContext()
    $rawPath = $ctx.Request.Url.LocalPath.TrimStart('/')
    $path = [System.Uri]::UnescapeDataString($rawPath)
    if ($path -eq '' -or $path -eq '/') { $path = 'index.html' }
    $file = Join-Path $root $path

    # Fallback to index.html for unknown routes (SPA)
    if (-not (Test-Path $file) -or (Get-Item $file -ErrorAction SilentlyContinue).PSIsContainer) {
        $file = Join-Path $root 'index.html'
    }

    try {
        $bytes = [System.IO.File]::ReadAllBytes($file)
        $ext   = [System.IO.Path]::GetExtension($file).ToLower()
        $ctx.Response.ContentType = switch ($ext) {
            '.css'  { 'text/css; charset=utf-8' }
            '.js'   { 'application/javascript; charset=utf-8' }
            '.png'  { 'image/png' }
            '.jpg'  { 'image/jpeg' }
            '.jpeg' { 'image/jpeg' }
            '.gif'  { 'image/gif' }
            '.webp' { 'image/webp' }
            '.svg'  { 'image/svg+xml' }
            '.json' { 'application/json; charset=utf-8' }
            default { 'text/html; charset=utf-8' }
        }
        $ctx.Response.AddHeader('Access-Control-Allow-Origin', '*')
        $ctx.Response.ContentLength64 = $bytes.Length
        $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } catch {
        try {
            $ctx.Response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes('Not found')
            $ctx.Response.ContentLength64 = $errBytes.Length
            $ctx.Response.OutputStream.Write($errBytes, 0, $errBytes.Length)
        } catch {}
    } finally {
        try { $ctx.Response.OutputStream.Close() } catch {}
        try { $ctx.Response.Close() } catch {}
    }
}
