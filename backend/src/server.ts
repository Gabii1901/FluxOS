import "dotenv/config";
import { app } from "./app";
import { iniciarCronCobrancas } from "./lib/cronCobrancas";

const port = process.env.PORT ?? 3333;

app.listen(port, () => {
  console.log(`FluxOS API rodando em http://localhost:${port}`);
});

iniciarCronCobrancas();
