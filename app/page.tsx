import Image from 'next/image';
import "./page.css";

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
