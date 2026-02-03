import express from 'express';
import dotenv from 'dotenv';
import { initDb, getReceiptById, updateReceiptReview, listReceipts, getAllReceipts } from './services/storage';
import { executeInferenceWithReceipt } from './middleware/adrs';
import * as intelligence from './services/intelligence';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Initialize Database
initDb().then(() => {
    console.log('Database initialized');
}).catch(err => {
    console.error('Failed to initialize database:', err);
});

/**
 * Root Route - Discoverability
 */
app.get('/', (req, res) => {
    res.send(`
        <div style="font-family: sans-serif; padding: 40px; line-height: 1.6;">
            <h1>🛡️ ADRS API is Live</h1>
            <p>The AI Decision Receipt System is functioning correctly.</p>
            <h3>Available Endpoints:</h3>
            <ul>
                <li><strong>Dashboard</strong>: <code>/api/audit/dashboard</code> (Header <code>x-role: ADMIN</code> required)</li>
                <li><strong>Recent Inference</strong>: <code>/api/inference</code> (POST)</li>
            </ul>
            <p>See the <a href="https://github.com/jenaarmaan/AI-Decision-Reciept-System">GitHub README</a> for full documentation.</p>
        </div>
    `);
});

/**
 * RBAC Middleware
 */
const checkRole = (roles: string[]) => {
    return (req: any, res: any, next: any) => {
        const userRole = req.headers['x-role'];
        if (!userRole || !roles.includes(userRole)) {
            return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
        }
        next();
    };
};

/**
 * POST /api/inference
 * Simulates AI inference and generates a Decision Receipt.
 */
app.post('/api/inference', async (req, res) => {
    try {
        const { userInput, systemInstructions, modelMetadata, requesterContext } = req.body;

        if (!userInput || !systemInstructions) {
            return res.status(400).json({ error: 'Missing userInput or systemInstructions' });
        }

        // Mock AI call implementation
        const mockAiCall = async (input: string, instructions: string) => {
            return `AI Response to: "${input}" based on instructions: "${instructions}"`;
        };

        const result = await executeInferenceWithReceipt(
            { userInput, systemInstructions, modelMetadata, requesterContext },
            mockAiCall
        );

        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/receipts/:id
 * Retrieves a specific Decision Receipt by ID.
 */
app.get('/api/receipts/:id', async (req, res) => {
    try {
        const receipt = await getReceiptById(req.params.id);
        if (!receipt) {
            return res.status(404).json({ error: 'Receipt not found' });
        }
        res.json(receipt);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/receipts/:id/review
 * Human override/approval endpoint.
 */
app.post('/api/receipts/:id/review', checkRole(['ADMIN']), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes, reviewerId } = req.body;

        if (!['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid review status' });
        }

        const reviewData = {
            reviewerId,
            reviewedAt: new Date().toISOString(),
            notes,
            overrideApplied: true
        };

        await updateReceiptReview(id, status, reviewData);
        res.json({ message: 'Review applied successfully', receiptId: id, status });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/audit/dashboard
 * List all receipts for audit review.
 */
app.get('/api/audit/dashboard', checkRole(['AUDITOR', 'ADMIN']), async (req, res) => {
    try {
        const receipts = await listReceipts();
        res.json(receipts);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/receipts/:id/export
 * Export receipt as a governance report (Markdown).
 */
app.get('/api/receipts/:id/export', checkRole(['AUDITOR', 'ADMIN']), async (req, res) => {
    try {
        const receipt = await getReceiptById(req.params.id);
        if (!receipt) return res.status(404).json({ error: 'Receipt not found' });

        const report = `
# AI Decision Receipt Report
- **ID**: ${receipt.id}
- **Timestamp**: ${receipt.timestamp}
- **Status**: ${receipt.approvalStatus}
- **Confidence**: ${receipt.decisionConfidence}

## User Input
> ${receipt.userInput}

## AI Output
${receipt.aiOutput}

## Justification
${receipt.reasoningSummary}

## Governance Metadata
- **Interpreted Intent**: ${receipt.interpretedIntent}
- **Reviewer Logs**: ${receipt.reviewMetadata ? JSON.stringify(receipt.reviewMetadata) : 'NO_REVIEW_YET'}
    `.trim();

        res.header('Content-Type', 'text/markdown');
        res.send(report);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/analytics/trends
 * Longitudinal intent volume analysis.
 */
app.get('/api/analytics/trends', checkRole(['AUDITOR', 'ADMIN']), async (req, res) => {
    try {
        const receipts = await getAllReceipts();
        const trends = intelligence.analyzeTrends(receipts);
        res.json(trends);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/analytics/drift
 * Cross-model version performance comparison.
 */
app.get('/api/analytics/drift', checkRole(['AUDITOR', 'ADMIN']), async (req, res) => {
    try {
        const receipts = await getAllReceipts();
        const drift = intelligence.detectDrift(receipts);
        res.json(drift);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/analytics/risks
 * Surfaces low-confidence/anomalous decisions.
 */
app.get('/api/analytics/risks', checkRole(['AUDITOR', 'ADMIN']), async (req, res) => {
    try {
        const threshold = req.query.threshold ? parseFloat(req.query.threshold as string) : 0.5;
        const receipts = await getAllReceipts();
        const anomalies = intelligence.detectAnomalies(receipts, threshold);
        res.json(anomalies);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`ADRS Server running on port ${PORT}`);
});
