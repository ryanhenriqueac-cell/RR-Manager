param(
  [string]$Background,
  [string]$Logo = (Join-Path $PSScriptRoot '..\assets\logo-rr-manager.png'),
  [string]$Output = (Join-Path $PSScriptRoot '..\marketing\panfleto-rr-manager-10x14cm.jpg')
)

Add-Type -AssemblyName System.Drawing

$width = 1181
$height = 1654
$canvas = New-Object System.Drawing.Bitmap($width, $height)
$canvas.SetResolution(300, 300)
$g = [System.Drawing.Graphics]::FromImage($canvas)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

$bg = [System.Drawing.Image]::FromFile((Resolve-Path $Background))
$g.DrawImage($bg, 0, 0, $width, $height)

function Brush([string]$hex, [int]$alpha = 255) {
  $color = [System.Drawing.ColorTranslator]::FromHtml($hex)
  return New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($alpha, $color.R, $color.G, $color.B))
}

function Font([float]$size, [System.Drawing.FontStyle]$style = [System.Drawing.FontStyle]::Regular) {
  return New-Object System.Drawing.Font('Arial', $size, $style, [System.Drawing.GraphicsUnit]::Pixel)
}

function Text([string]$value, [float]$x, [float]$y, [float]$w, [float]$h, $font, $brush, [System.Drawing.StringAlignment]$align = [System.Drawing.StringAlignment]::Near) {
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = $align
  $fmt.LineAlignment = [System.Drawing.StringAlignment]::Near
  $fmt.Trimming = [System.Drawing.StringTrimming]::EllipsisWord
  $g.DrawString($value, $font, $brush, (New-Object System.Drawing.RectangleF($x, $y, $w, $h)), $fmt)
  $fmt.Dispose()
}

$navy = Brush '#03152d' 226
$navySolid = Brush '#03152d'
$cyan = Brush '#16bdf3'
$white = Brush '#ffffff'
$soft = Brush '#d6ecfa'
$green = Brush '#22c779'
$silver = Brush '#a9c6d9'

# Header shield for maximum logo/headline contrast.
$g.FillRectangle($navy, 0, 0, $width, 515)
$g.FillRectangle((Brush '#071f3c' 220), 0, 515, 610, 660)

$logoImg = [System.Drawing.Image]::FromFile((Resolve-Path $Logo))
$logoBox = 215
$g.DrawImage($logoImg, 58, 34, $logoBox, $logoBox)

Text 'SISTEMA DE GESTÃO PARA OFICINAS' 298 67 800 40 (Font 27 ([System.Drawing.FontStyle]::Bold)) $cyan
Text 'RR AUTOMOTIVE • PAIXÃO POR CARROS' 298 113 800 34 (Font 20) $silver

Text 'ORÇAMENTOS' 58 260 1065 90 (Font 70 ([System.Drawing.FontStyle]::Bold)) $white
Text 'PROFISSIONAIS.' 58 340 1065 90 (Font 70 ([System.Drawing.FontStyle]::Bold)) $white
Text 'LUCRO SOB CONTROLE.' 58 425 1065 65 (Font 48 ([System.Drawing.FontStyle]::Bold)) $cyan

Text 'Tudo o que sua oficina precisa' 58 550 520 42 (Font 28 ([System.Drawing.FontStyle]::Bold)) $white
Text 'em um só lugar:' 58 586 520 42 (Font 28 ([System.Drawing.FontStyle]::Bold)) $white

$items = @(
  'Orçamentos com a marca da sua oficina',
  'Envio rápido pelo WhatsApp',
  'Clientes e veículos organizados',
  'Custos, pagamentos e lucro',
  'Funciona no celular e computador'
)
$y = 658
foreach ($item in $items) {
  $g.FillEllipse($green, 60, $y + 6, 28, 28)
  Text '✓' 61 ($y - 1) 28 32 (Font 22 ([System.Drawing.FontStyle]::Bold)) $white ([System.Drawing.StringAlignment]::Center)
  Text $item 105 $y 470 74 (Font 25 ([System.Drawing.FontStyle]::Bold)) $white
  $y += 91
}

# Price and CTA footer.
$g.FillRectangle($navySolid, 0, 1370, $width, 284)
$g.FillRectangle($cyan, 0, 1370, $width, 9)
Text 'R$ 79,90' 52 1404 520 90 (Font 74 ([System.Drawing.FontStyle]::Bold)) $white
Text '/mês' 410 1454 170 44 (Font 28) $soft
Text 'SEM FIDELIDADE' 58 1503 450 42 (Font 25 ([System.Drawing.FontStyle]::Bold)) $cyan

$ctaBrush = Brush '#16bdf3'
$g.FillRectangle($ctaBrush, 585, 1410, 540, 95)
Text 'CONHEÇA O RR MANAGER' 600 1436 510 45 (Font 28 ([System.Drawing.FontStyle]::Bold)) $navySolid ([System.Drawing.StringAlignment]::Center)
Text 'WhatsApp: (31) 99785-1561' 585 1532 540 45 (Font 29 ([System.Drawing.FontStyle]::Bold)) $white ([System.Drawing.StringAlignment]::Center)

$outDir = Split-Path -Parent $Output
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }
$jpeg = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
$quality = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 94L)
$params = New-Object System.Drawing.Imaging.EncoderParameters(1)
$params.Param[0] = $quality
$canvas.Save($Output, $jpeg, $params)

$params.Dispose(); $quality.Dispose(); $logoImg.Dispose(); $bg.Dispose(); $g.Dispose(); $canvas.Dispose()
Write-Output (Resolve-Path $Output)
