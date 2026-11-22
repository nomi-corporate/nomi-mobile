import { View, type ViewStyle } from 'react-native';
import { useNomiTheme } from '@/theme/NomiThemeProvider';
import CalculusDark from '../../assets/design-system/subject-calculus-dark.svg';
import CalculusLight from '../../assets/design-system/subject-calculus-light.svg';
import PhysicsDark from '../../assets/design-system/subject-physics-dark.svg';
import PhysicsLight from '../../assets/design-system/subject-physics-light.svg';
import ChemistryDark from '../../assets/design-system/subject-chemistry-dark.svg';
import ChemistryLight from '../../assets/design-system/subject-chemistry-light.svg';
import BiologyDark from '../../assets/design-system/subject-biology-dark.svg';
import BiologyLight from '../../assets/design-system/subject-biology-light.svg';
import ProgrammingDark from '../../assets/design-system/subject-programming-dark.svg';
import ProgrammingLight from '../../assets/design-system/subject-programming-light.svg';
import SoftwareEngineeringDark from '../../assets/design-system/subject-software-engineering-dark.svg';
import SoftwareEngineeringLight from '../../assets/design-system/subject-software-engineering-light.svg';
import PortugueseDark from '../../assets/design-system/subject-portuguese-literature-dark.svg';
import PortugueseLight from '../../assets/design-system/subject-portuguese-literature-light.svg';
import HistoryDark from '../../assets/design-system/subject-history-dark.svg';
import HistoryLight from '../../assets/design-system/subject-history-light.svg';

export type NomiSubject = 'calculo-matematica' | 'fisica' | 'quimica' | 'biologia' | 'programacao' | 'engenharia-software' | 'portugues-literatura' | 'historia';

const icons = {
  'calculo-matematica': [CalculusLight, CalculusDark],
  fisica: [PhysicsLight, PhysicsDark],
  quimica: [ChemistryLight, ChemistryDark],
  biologia: [BiologyLight, BiologyDark],
  programacao: [ProgrammingLight, ProgrammingDark],
  'engenharia-software': [SoftwareEngineeringLight, SoftwareEngineeringDark],
  'portugues-literatura': [PortugueseLight, PortugueseDark],
  historia: [HistoryLight, HistoryDark],
} as const;

type Props = { subject: NomiSubject; size?: number; style?: ViewStyle };

export function NomiSubjectIcon({ subject, size = 24, style }: Props) {
  const { colorScheme } = useNomiTheme();
  const dark = colorScheme === 'dark';
  const Icon = icons[subject][dark ? 1 : 0];
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={style}><Icon width={size} height={size} /></View>;
}
