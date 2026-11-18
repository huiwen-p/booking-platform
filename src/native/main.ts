import { createNativeServer } from './server.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const server = createNativeServer();

server.listen(PORT, () => {
  console.log(`[Native Engine] Server is listening on http://localhost:${PORT}`);
});
