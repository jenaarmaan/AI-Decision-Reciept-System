import { DecisionReceipt } from '../types/receipt';

export interface TrendData {
    intent: string;
    count: number;
}

export interface DriftData {
    version: string;
    avgConfidence: number;
}

/**
 * Analyze volume trends by intent
 */
export const analyzeTrends = (receipts: DecisionReceipt[]): TrendData[] => {
    const trends: Record<string, number> = {};
    receipts.forEach(r => {
        const intent = r.interpretedIntent || 'UNKNOWN';
        trends[intent] = (trends[intent] || 0) + 1;
    });
    return Object.entries(trends).map(([intent, count]) => ({ intent, count }));
};

/**
 * Detect performance drift across model versions
 */
export const detectDrift = (receipts: DecisionReceipt[]): DriftData[] => {
    const versions: Record<string, { totalConfidence: number; count: number }> = {};
    receipts.forEach(r => {
        const version = r.modelMetadata.version;
        if (!versions[version]) versions[version] = { totalConfidence: 0, count: 0 };
        versions[version].totalConfidence += r.decisionConfidence;
        versions[version].count += 1;
    });

    return Object.entries(versions).map(([version, data]) => ({
        version,
        avgConfidence: Math.round((data.totalConfidence / data.count) * 100) / 100
    }));
};

/**
 * Identify anomalous/high-risk decisions (low confidence)
 */
export const detectAnomalies = (receipts: DecisionReceipt[], threshold: number = 0.5): DecisionReceipt[] => {
    return receipts.filter(r => r.decisionConfidence < threshold);
};
