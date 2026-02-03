export interface RetrievalSource {
    id: string;
    uri: string;
    snippet: string;
    confidenceScore: number;
    metadata: Record<string, any>;
}

export interface DecisionReceipt {
    id: string;
    timestamp: string;
    requesterContext: {
        userId?: string;
        systemId: string;
        correlationId: string;
    };
    modelMetadata: {
        name: string;
        version: string;
        provider: string;
        configuration: Record<string, any>;
    };
    userInput: string;
    interpretedIntent?: string;
    systemInstructions: string;
    aiOutput: string;
    retrievalSources?: RetrievalSource[];
    reasoningSummary: string; // Required for Phase 3
    decisionConfidence: number; // New in Phase 3
    approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
    reviewMetadata?: {
        reviewerId: string;
        reviewedAt: string;
        notes: string;
        overrideApplied: boolean;
        previousOutput?: string;
    };
}
