import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, Crown, Flame, Trophy } from 'lucide-react-native';

import { getPeriodRange } from '@padelking/domain';

const featuredCommunities = [
  { rank: 1, name: 'La Pala', city: 'Bogotá', pts: 2148, badge: '🏆' },
  { rank: 2, name: 'Spimpad', city: 'Bogotá', pts: 2096 },
  { rank: 3, name: 'Valkiria', city: 'Bogotá', pts: 1942 },
  { rank: 4, name: 'Globo Crew', city: 'Bogotá', pts: 1820 },
  { rank: 5, name: 'El Parche', city: 'Medellín', pts: 1755 },
];

export default function HomeScreen() {
  const monthLabel = getPeriodRange('monthly').label;

  return (
    <SafeAreaView className="flex-1 bg-court-950">
      <ScrollView className="flex-1" contentContainerClassName="pb-12">
        <View className="px-6 pt-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View className="size-8 rounded-lg bg-pulse" />
              <Text className="font-display text-xl font-bold text-white">
                Padel <Text className="text-pulse">Pulse</Text>
              </Text>
            </View>
            <Flame size={20} color="#ec4899" />
          </View>

          <Text className="font-display mt-10 text-4xl font-bold text-white">
            Hola, jugador.
          </Text>
          <Text className="mt-2 text-base text-white/60">
            Tu comunidad está en <Text className="text-pulse">#7</Text> nacional este mes.
          </Text>
        </View>

        <View className="mt-8 px-6">
          <View className="flex-row items-center justify-between">
            <Text className="font-display text-lg font-bold text-white">Ranking · {monthLabel}</Text>
            <Link href="/rankings" asChild>
              <Pressable className="flex-row items-center gap-1">
                <Text className="text-sm text-pulse">Ver todo</Text>
                <ArrowRight size={14} color="#ec4899" />
              </Pressable>
            </Link>
          </View>
        </View>

        <View className="mt-4 gap-2 px-6">
          {featuredCommunities.map((c) => (
            <View
              key={c.name}
              className="flex-row items-center gap-3 rounded-2xl border border-white/5 bg-white/5 p-4"
            >
              <Text
                className={`font-display w-6 text-center text-lg font-bold ${
                  c.rank === 1 ? 'text-pulse' : c.rank <= 3 ? 'text-court-300' : 'text-white/40'
                }`}
              >
                {c.rank}
              </Text>
              <View className="size-9 rounded-lg bg-court-600" />
              <View className="flex-1">
                <Text className="font-display font-semibold text-white">
                  {c.name} {c.badge ?? ''}
                </Text>
                <Text className="text-xs text-white/50">{c.city}</Text>
              </View>
              <Text className="font-mono text-sm font-semibold text-court-300">{c.pts}</Text>
            </View>
          ))}
        </View>

        <View className="mt-10 px-6">
          <View className="rounded-3xl border border-pulse/30 bg-pulse/10 p-6">
            <View className="flex-row items-center gap-2">
              <Trophy size={18} color="#ec4899" />
              <Text className="text-xs uppercase tracking-widest text-pulse">Próximo torneo</Text>
            </View>
            <Text className="font-display mt-3 text-2xl font-bold text-white">
              Copa PadelKing{'\n'}Bogotá · Junio 2026
            </Text>
            <Text className="mt-2 text-white/60">
              Sáb 14 · Club La Pala · Americano 16 parejas
            </Text>
            <Pressable className="mt-5 flex-row items-center justify-center gap-2 rounded-xl bg-pulse py-3.5">
              <Crown size={18} color="white" />
              <Text className="font-display font-semibold text-white">Inscribir comunidad</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
