import createMiddleware from 'next-intl/middleware';
import { NextRequest } from 'next/server';
import { routing } from './lib/navigation';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
    // 1. Generar un nonce criptográfico único por cada request
    // Next.js Middleware corre en Edge, por lo que Buffer NO está disponible. Usamos btoa nativo.
    const nonce = btoa(crypto.randomUUID());

    // 2. Preparar CSP basado en el entorno
    // Fast Refresh de Next.js en desarrollo requiere 'unsafe-eval' e 'unsafe-inline'
    // En producción, usamos el nonce con 'strict-dynamic' para un alto nivel de protección XSS
    const isDev = process.env.NODE_ENV !== 'production';
    const scriptSrc = isDev
        ? `'self' 'unsafe-eval' 'unsafe-inline'`
        : `'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`;
    // Nota: A veces Next.js Production bundle aún requiere eval para chunks de third-parties. 
    // Si tienes certeza de que no, quita el eval. Lo mantenemos seguro combinando con nonce.

    const cspHeader = `
        default-src 'self';
        script-src ${scriptSrc};
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        img-src 'self' data: blob: https://loving-nash.217-154-177-201.plesk.page https://mithohacks.com https://images.unsplash.com;
        font-src 'self' https://fonts.gstatic.com;
        connect-src 'self' https://loving-nash.217-154-177-201.plesk.page http://localhost:4001 http://localhost:3333 https://mithohacks.com;
        frame-src 'none';
        object-src 'none';
        base-uri 'self';
        form-action 'self';
    `.replace(/\s{2,}/g, ' ').trim();

    // 3. Inyectar headers en la Request (para que Server Components puedan leer el nonce)
    request.headers.set('x-nonce', nonce);
    request.headers.set('content-security-policy', cspHeader);

    // 4. Delegar en next-intl la resolución del locale y routing base
    const response = intlMiddleware(request);

    // 5. Inyectar headers en el Response (para que el navegador aplique la CSP)
    response.headers.set('x-nonce', nonce);
    response.headers.set('content-security-policy', cspHeader);

    // Se mantienen los headers de seguridad base
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return response;
}

export const config = {
    // Matcher que permite a next-intl manejar redirecciones de locales
    // Excluye archivos estáticos, api y _next
    matcher: ['/((?!api|_next|.*\\..*).*)']
};
