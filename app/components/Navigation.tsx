import Link from 'next/link';

export default function Navigation() {
  return (
    <nav>
      <Link href="/">Home</Link>
      <Link href="/dashboard">Dashboard</Link>
      <Link href="/dashboard/settings">Settings</Link>
      <Link href="/users/123">User Profile</Link>
    </nav>
  );
}