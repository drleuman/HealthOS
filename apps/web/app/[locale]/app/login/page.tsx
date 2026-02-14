'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Page, Card, Button, Input, Property } from '../../components/ui';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Redirect if already authenticated
    useEffect(() => {
        if (api.isAuthenticated()) {
            router.push('/today');
        }
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await api.login(email);

            // Check if user needs onboarding
            try {
                await api.getToday();
                // Has program, go to today
                router.push('/today');
            } catch {
                // No program yet, needs onboarding
                router.push('/onboarding');
            }
        } catch (err: any) {
            setError(err instanceof Error ? err.message : 'Login failed');
            setLoading(false);
        }
    };

    return (
        <Page>
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '100%', maxWidth: '400px', padding: '0 20px' }}>
                    <Card>
                        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                            <h1 style={{ marginBottom: '8px' }}>HealthOS</h1>
                            <p>Acceso al sistema de registro</p>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '16px' }}>
                                <Property label="MODO" value="LATENTE" />
                                <Property label="FEEDBACK" value="ASÍNCRONO" />
                            </div>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <Input
                                label="Identificador (Email)"
                                type="email"
                                placeholder="usuario@protocolo.com"
                                value={email}
                                onChange={setEmail}
                                required
                            />

                            <Button
                                type="submit"
                                disabled={loading || !email}
                                className="full-width"
                            >
                                {loading ? 'Validando...' : 'Acceder'}
                            </Button>

                            {error && (
                                <div style={{
                                    marginTop: '16px',
                                    color: 'var(--danger)',
                                    fontSize: '14px',
                                    textAlign: 'center',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    background: 'rgba(255, 77, 109, 0.1)'
                                }}>
                                    {error}
                                </div>
                            )}
                        </form>
                    </Card>

                    <p style={{
                        textAlign: 'center',
                        fontSize: '12px',
                        color: 'var(--faint)',
                        marginTop: '24px'
                    }}>
                        Al continuar, aceptas nuestros términos de servicio.
                    </p>
                </div>
            </div>
        </Page>
    );
}
