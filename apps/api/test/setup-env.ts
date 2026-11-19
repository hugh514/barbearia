// Os e2e isolam clientes pelo X-Forwarded-For, então confiam no proxy.
// Força true mesmo se o .env copiado do exemplo trouxer false.
// O padrão de produção (não confiar) é testado em feature-015.
process.env.TRUST_PROXY = 'true';
