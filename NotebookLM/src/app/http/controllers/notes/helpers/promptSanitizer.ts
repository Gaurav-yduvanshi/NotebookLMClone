/**
 * Sanitize prompts to avoid content moderation issues
 * Removes or replaces potentially problematic words
 */
export const sanitizePrompt = (prompt: string): string => {
    let sanitized = prompt;

    // List of words/phrases to avoid or replace
    const problematicPatterns = [
        { pattern: /violence|violent|weapon|kill|death|bomb|destroy|warfare/gi, replacement: "conflict" },
        { pattern: /hate|racist|sexist|discrimination/gi, replacement: "bias" },
        { pattern: /adult|explicit|nude|sexual/gi, replacement: "mature" },
        { pattern: /drug|cocaine|heroin|methamphetamine/gi, replacement: "substance" },
        { pattern: /suicide|self-harm|cutting/gi, replacement: "harm" },
    ];

    for (const { pattern, replacement } of problematicPatterns) {
        sanitized = sanitized.replace(pattern, replacement);
    }

    // Ensure prompt is not empty after sanitization
    if (!sanitized.trim()) {
        sanitized = "A creative illustration of a concept";
    }

    return sanitized;
};
