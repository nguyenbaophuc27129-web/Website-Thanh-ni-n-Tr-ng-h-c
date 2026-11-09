[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Extract-DocxText($docxPath, $outTxtPath) {
    $zip = [System.IO.Compression.ZipFile]::OpenRead($docxPath)
    $entry = $zip.GetEntry("word/document.xml")
    $stream = $entry.Open()
    $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
    $content = $reader.ReadToEnd()
    $reader.Close()
    $stream.Close()
    $zip.Dispose()

    # Match all <w:p>...</w:p> and extract text inside <w:t>...</w:t>
    $xml = [xml]$content
    $ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
    $ns.AddNamespace("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main")
    
    $paragraphs = $xml.SelectNodes("//w:p", $ns)
    $lines = @()
    foreach ($p in $paragraphs) {
        $textNodes = $p.SelectNodes(".//w:t", $ns)
        $pText = ""
        foreach ($t in $textNodes) {
            $pText += $t.InnerText
        }
        $lines += $pText
    }
    
    $fullText = $lines -join "`r`n"
    [System.IO.File]::WriteAllText($outTxtPath, $fullText, [System.Text.Encoding]::UTF8)
    Write-Host "Extracted $docxPath -> $outTxtPath ($($lines.Count) lines, $($fullText.Length) chars)"
}

Extract-DocxText "C:\Users\Admin\Desktop\Thanh niên trường học\Mẫu văn bản\Dac_ta_huan_luyen_AI_agent_bao_cao_Doan.docx" "C:\Users\Admin\Desktop\Thanh niên trường học\tnth-website\scripts\dac_ta.txt"
Extract-DocxText "C:\Users\Admin\Desktop\Thanh niên trường học\Mẫu văn bản\Bao_cao_tuan_ThanhDoan_TPHCM_06-12.10.2026_mau_dau_ra.docx" "C:\Users\Admin\Desktop\Thanh niên trường học\tnth-website\scripts\mau_dau_ra.txt"
