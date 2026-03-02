import Image from 'next/image';

export default function HomePage() {
  return (
    <s-box className="center-logo-page">
      <Image
        src="/logo.png"
        width={430}
        height={430}
        alt="EZOKO"
      />
    </s-box>
  );
}
