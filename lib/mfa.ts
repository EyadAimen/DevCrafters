import { supabase } from './supabase';

export const MFA = {
    /**
     * List all authentication factors for the current user (verified and unverified).
     */
    async listFactors() {
        const { data, error } = await supabase.auth.mfa.listFactors();
        if (error) throw error;
        return data.all;
    },

    /**
     * Get formatted array of verified TOTP factors
     */
    async getVerifiedFactors() {
        const factors = await this.listFactors();
        return factors.filter(f => f.status === 'verified' && f.factor_type === 'totp');
    },

    /**
     * Initiate enrollment of a new TOTP factor.
     * Returns the factor ID, secret, and QR code details.
     */
    async enroll() {
        const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
        if (error) throw error;
        return data; // contains id, type, totp: { qr_code, secret, uri }
    },

    /**
     * Verify a code to finalize enrollment or to authenticate (login).
     * This involves creating a challenge first, then verifying it.
     */
    async verifyCode(factorId: string, code: string) {
        // 1. Create a challenge for the factor
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
        if (challengeError) throw challengeError;

        // 2. Verify the code against the challenge
        const { data, error } = await supabase.auth.mfa.verify({
            factorId,
            challengeId: challengeData.id,
            code,
        });

        if (error) throw error;
        return data;
    },

    /**
     * Remove a factor (disable MFA).
     */
    async unenroll(factorId: string) {
        const { data, error } = await supabase.auth.mfa.unenroll({ factorId });
        if (error) throw error;
        return data;
    },

    /**
     * Check if the current session has AAL2 (MFA verified) assurance
     */
    async isAssuranceLevel2() {
        const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        return data?.currentLevel === 'aal2';
    }
};
