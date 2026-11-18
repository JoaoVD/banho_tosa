import { getUser } from '@/auth/current';

export default async function HojePage() {
  const user = await getUser();
  return <h1>Bom dia, {user.nome}</h1>;
}
