import { Link, type Href } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { BRAND } from '@/constants/brand';

type Props = {
  href: Href;
  children: string;
};

export function AuthTextLink({ href, children }: Props) {
  return (
    <Link href={href} asChild>
      <Pressable hitSlop={12} className="py-2.5 active:opacity-65">
        <Text style={{ color: BRAND.green }} className="text-center text-[15px] font-semibold">
          {children}
        </Text>
      </Pressable>
    </Link>
  );
}
