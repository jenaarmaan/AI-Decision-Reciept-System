$body = @{
    userInput = "What are the primitives of ADRS?"
    systemInstructions = "You are an AI governance architect."
    modelMetadata = @{
        name = "gpt-4"
        version = "1.0"
        provider = "OpenAI"
        configuration = @{ temperature = 0.5 }
    }
    requesterContext = @{
        systemId = "audit-tool-v1"
        correlationId = "corr-12345"
    }
} | ConvertTo-Json

Write-Host "--- Testing Inference API ---"
$resp = Invoke-RestMethod -Uri http://localhost:3000/api/inference -Method Post -Body $body -ContentType "application/json"
$resp | ConvertTo-Json

$receiptId = $resp.receiptId
Write-Host "`n--- Testing Receipt Retrieval API (ID: $receiptId) ---"
$receipt = Invoke-RestMethod -Uri "http://localhost:3000/api/receipts/$receiptId" -Method Get
$receipt | ConvertTo-Json
