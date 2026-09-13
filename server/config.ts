import 'dotenv/config';
/** Browser origin allowed to call the API and open sockets. */
export const clientOrigin = process.env.CLIENT_ORIGIN ?? 'http://127.0.0.1:5173';
export const port = Number(process.env.PORT ?? 3001);
export const isProduction = process.env.NODE_ENV === 'production';
