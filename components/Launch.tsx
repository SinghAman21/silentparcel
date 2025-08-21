// components/peerlist-badge.tsx
'use client';
import Image from 'next/image';
import Link from 'next/link';

export function PeerlistBadge() {
  return (
    <div className="flex justify-center mb-10" id="peerlistBtn">
      <Link
        href="https://peerlist.io/singhaman21/project/silentparcel--secure-file-sharing--chatting"
        target="_blank"
        rel="noreferrer"
        className="flex justify-center transition-filter duration-300 [filter:drop-shadow(0_0_8px_rgba(255,215,0,0.3))]"
      >
        <Image
          src="https://peerlist.io/api/v1/projects/embed/PRJHOK8DE6B88R7JDIPJP7D89LQDGL?showUpvote=true&theme=light"
          alt="SilentParcel - Secure File Sharing & Chatting"
          width={200}
          height={60}
          className="w-auto"
          style={{ width: 'auto', height: '59px' }}
        />
      </Link>
    </div>
  );
}

export function ProductHunt() {
  return (
    <Link
      href="https://www.producthunt.com/products/silentparcel?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-silentparcel"
      target="_blank"
      rel="noreferrer"
    >
      <Image
        src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1001923&theme=neutral&t=1754738365871"
        alt="SilentParcel - Secure File Sharing | Product Hunt"
        width={250}
        height={54}
        style={{ width: '250px', height: '59px' }}
      />
    </Link>
  );
}

export default {
  PeerlistBadge,
  ProductHunt
};