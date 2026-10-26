# Previsualisation DEADELUSTV sans installation (Windows PowerShell 5.1).
# Sert public/ et relaie uniquement /api/twitch-status vers OVH.
$ErrorActionPreference = 'Stop'
$port = 8766
$upstream = 'https://www.deadelustv.com/api/twitch-status'
$public = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\public'))
if (-not (Test-Path (Join-Path $public 'index.html'))) { throw 'Dossier public introuvable.' }
$prefix = $public.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar

function Text-Bytes([string]$text) { return ,([Text.Encoding]::UTF8.GetBytes($text)) }
function Respond([IO.Stream]$stream, [int]$status, [string]$mime, [byte[]]$body) {
  $reason = switch ($status) { 200 {'OK'} 403 {'Forbidden'} 404 {'Not Found'} 405 {'Method Not Allowed'} 503 {'Service Unavailable'} default {'Error'} }
  $header = "HTTP/1.1 $status $reason`r`nContent-Type: $mime`r`nContent-Length: $($body.Length)`r`nCache-Control: no-store`r`nX-Content-Type-Options: nosniff`r`nConnection: close`r`n`r`n"
  $bytes = [Text.Encoding]::ASCII.GetBytes($header)
  $stream.Write($bytes, 0, $bytes.Length)
  if ($body.Length -gt 0) { $stream.Write($body, 0, $body.Length) }
  $stream.Flush()
}
function Mime([string]$ext) {
  switch ($ext.ToLowerInvariant()) {
    '.html' {'text/html; charset=utf-8'}
    '.css' {'text/css; charset=utf-8'}
    '.js' {'text/javascript; charset=utf-8'}
    '.json' {'application/json; charset=utf-8'}
    '.svg' {'image/svg+xml'}
    '.png' {'image/png'}
    '.jpg' {'image/jpeg'}
    '.jpeg' {'image/jpeg'}
    '.gif' {'image/gif'}
    '.webp' {'image/webp'}
    '.avif' {'image/avif'}
    '.ico' {'image/x-icon'}
    '.woff2' {'font/woff2'}
    '.woff' {'font/woff'}
    '.ttf' {'font/ttf'}
    default {'application/octet-stream'}
  }
}

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$server = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $port)
try {
  $server.Start()
  Write-Host 'Test DEADELUSTV sans Python' -ForegroundColor Cyan
  Write-Host "Site : http://127.0.0.1:$port/"
  Write-Host "API  : http://127.0.0.1:$port/api/twitch-status"
  Write-Host 'Garder cette fenetre ouverte. Ctrl+C pour arreter.'
  while ($true) {
    $client = $server.AcceptTcpClient()
    try {
      $client.ReceiveTimeout = 8000
      $client.SendTimeout = 8000
      $stream = $client.GetStream()
      $reader = [IO.StreamReader]::new($stream, [Text.Encoding]::ASCII, $false, 4096, $true)
      $first = $reader.ReadLine()
      if ([string]::IsNullOrWhiteSpace($first)) { continue }
      do { $line = $reader.ReadLine() } while ($null -ne $line -and $line -ne '')
      $tokens = $first.Split(' ')
      if ($tokens.Length -lt 2 -or $tokens[0] -ne 'GET') {
        Respond $stream 405 'text/plain; charset=utf-8' (Text-Bytes 'GET uniquement')
        continue
      }
      $urlPath = [Uri]::UnescapeDataString(($tokens[1] -split '\?', 2)[0])
      if ($urlPath -eq '/api/twitch-status') {
        try {
          $req = [Net.HttpWebRequest][Net.WebRequest]::Create($upstream)
          $req.Method = 'GET'
          $req.Accept = 'application/json'
          $req.Timeout = 8000
          $req.ReadWriteTimeout = 8000
          $response = $req.GetResponse()
          try {
            $status = [int]$response.StatusCode
            $bodyReader = [IO.StreamReader]::new($response.GetResponseStream(), [Text.Encoding]::UTF8)
            try { $json = $bodyReader.ReadToEnd() } finally { $bodyReader.Dispose() }
            if ($json.Length -gt 8192) { throw 'API trop longue' }
            $body = Text-Bytes $json
          } finally { $response.Dispose() }
        } catch [Net.WebException] {
          $failed = $_.Exception.Response
          if ($null -eq $failed) { $status = 503 }
          else { try { $status = [int]$failed.StatusCode } finally { $failed.Dispose() } }
          $body = Text-Bytes '{"error":"unavailable"}'
        } catch {
          $status = 503
          $body = Text-Bytes '{"error":"unavailable"}'
        }
        Respond $stream $status 'application/json; charset=utf-8' $body
        continue
      }
      if ($urlPath -eq '/') { $urlPath = '/index.html' }
      # Attention PowerShell : ne pas chaîner des méthodes directement dans les
      # arguments d'un cmdlet (Join-Path), la chaîne peut être mal interprétée.
      if (-not $urlPath.StartsWith('/')) {
        Respond $stream 403 'text/plain; charset=utf-8' (Text-Bytes 'Chemin invalide')
        continue
      }
      $relativePath = $urlPath.Substring(1)
      $relativePath = $relativePath.Replace([char]'/', [IO.Path]::DirectorySeparatorChar)
      try {
        $combinedPath = [IO.Path]::Combine([string]$public, [string]$relativePath)
        $path = [IO.Path]::GetFullPath($combinedPath)
      } catch {
        Write-Host "Chemin local invalide : $urlPath" -ForegroundColor Yellow
        Respond $stream 403 'text/plain; charset=utf-8' (Text-Bytes 'Chemin invalide')
        continue
      }
      if (-not $path.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) {
        Respond $stream 403 'text/plain; charset=utf-8' (Text-Bytes 'Acces interdit')
        continue
      }
      if (-not [IO.File]::Exists($path)) {
        Respond $stream 404 'text/plain; charset=utf-8' (Text-Bytes 'Fichier introuvable')
        continue
      }
      $body = [IO.File]::ReadAllBytes($path)
      Respond $stream 200 (Mime ([IO.Path]::GetExtension($path))) $body
    } catch {
      Write-Host "Erreur locale : $($_.Exception.Message)" -ForegroundColor Yellow
    } finally {
      $client.Dispose()
    }
  }
} finally { $server.Stop() }
