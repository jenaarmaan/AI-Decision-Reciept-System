import express from 'express';
import dotenv from 'dotenv';
import { initDb, getReceiptById } from './services/storage';
import { executeInferenceWithReceipt } from './middleware/adrs';

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

app.listen(PORT, () => {
    console.log(`ADRS Server running on port ${PORT}`);
});
