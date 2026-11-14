import type * as React from 'react';

export type IconName = 'menu' | 'cart' | 'play' | 'pause' | 'check' | 'x' | 'chevronDown' | 'whatsapp' | 'clock' | 'printer' | 'truck' | 'star' | 'package' | 'coffee' | 'thermo' | 'gift' | 'banknote' | 'zap' | 'pin' | 'refresh' | 'undo' | 'trendUp' | 'trendDown' | 'grip' | 'calendar' | 'shield' | 'alert';
export type OrderStatus = 'new' | 'pending' | 'confirmed' | 'shipped' | 'returned';
export interface Order { id: string; name: string; amount: number; city: string; status: OrderStatus; phone?: string; product?: string; age?: string; carrier?: string; tracking?: string }

export interface IconProps { name: IconName; size?: number; strokeWidth?: number; label?: string; className?: string }
export declare function Icon(props: IconProps): React.ReactElement;
export interface WordmarkProps { className?: string; /** Image du logo (assets/Logos) ; sinon le nom en Syne. */ src?: string; height?: number }
export declare function Wordmark(props: WordmarkProps): React.ReactElement;
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?: 'primary' | 'dark' | 'ghost' | 'whatsapp'; size?: 'sm' | 'md' | 'xl'; block?: boolean; icon?: IconName; iconRight?: IconName; href?: string; target?: string; rel?: string }
export declare function Button(props: ButtonProps): React.ReactElement;
export interface NavbarProps { logoSrc?: string; logoHeight?: number; count?: number; onMenu?: () => void; onCart?: () => void }
export declare function Navbar(props: NavbarProps): React.ReactElement;
export interface MobileFrameProps { height?: number | string; className?: string; children?: React.ReactNode }
export declare function MobileFrame(props: MobileFrameProps): React.ReactElement;
export interface StoryVideoProps { src?: string; poster?: string; caption?: string; author?: string; handle?: string; index?: number }
export declare function StoryVideo(props: StoryVideoProps): React.ReactElement;
export interface PriceTagProps { price?: number; currency?: string; compareAt?: number; shippingLabel?: string }
export declare function PriceTag(props: PriceTagProps): React.ReactElement;
export interface ProductCardProps { name?: string; pitch?: string; eyebrow?: string; price?: number; compareAt?: number; ctaLabel?: string; onBuy?: () => void }
export declare function ProductCard(props: ProductCardProps): React.ReactElement;
export interface SavingsCalculatorProps { min?: number; max?: number; step?: number; defaultValue?: number; homeCostPerDay?: number; daysPerMonth?: number; packPrice?: number; onChange?: (dailySpend: number, monthlySaving: number) => void }
export declare function SavingsCalculator(props: SavingsCalculatorProps): React.ReactElement;
export interface IncludedItem { icon?: IconName; title: string; detail?: string; tag?: string }
export interface IncludedListProps { items?: IncludedItem[] }
export declare function IncludedList(props: IncludedListProps): React.ReactElement;
export interface ReviewCardProps { name: string; city: string; text: string; rating?: number; verified?: boolean }
export declare function ReviewCard(props: ReviewCardProps): React.ReactElement;
export interface StickyCtaProps { visible?: boolean; price?: number; label?: string; onClick?: () => void }
export declare function StickyCta(props: StickyCtaProps): React.ReactElement;
export interface BottomSheetProps { open: boolean; onClose?: () => void; title: React.ReactNode; subtitle?: React.ReactNode; contained?: boolean; children?: React.ReactNode }
export declare function BottomSheet(props: BottomSheetProps): React.ReactElement;
export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> { label: string; hint?: string; error?: string | null; onValueChange?: (value: string) => void }
export declare function TextField(props: TextFieldProps): React.ReactElement;
export interface PhoneInputProps { id?: string; value: string; onChange?: (digits: string) => void; onBlur?: () => void; error?: string | null; label?: string; hint?: string }
export declare function PhoneInput(props: PhoneInputProps): React.ReactElement;
export interface GovernorateSelectProps { id?: string; value?: string; onChange?: (governorate: string) => void; onBlur?: () => void; error?: string | null; popular?: string[]; label?: string }
export declare function GovernorateSelect(props: GovernorateSelectProps): React.ReactElement;
export interface CheckoutFormProps { price?: number; productName?: string; whatsappNumber?: string; onSubmit?: (order: Order) => void; onClose?: () => void }
export declare function CheckoutForm(props: CheckoutFormProps): React.ReactElement;
export interface KpiCardProps { label: string; value: string; icon?: IconName; delta?: string; trend?: 'up' | 'down'; good?: boolean; period?: string; accent?: boolean }
export declare function KpiCard(props: KpiCardProps): React.ReactElement;
export interface StatusBadgeProps { status: OrderStatus }
export declare function StatusBadge(props: StatusBadgeProps): React.ReactElement;
export interface OrderCardProps { order: Order; onAction?: (order: Order, action: 'whatsapp' | 'remind' | 'print', whatsappMessage: string) => void; draggable?: boolean; showStatus?: boolean }
export declare function OrderCard(props: OrderCardProps): React.ReactElement;
export interface KanbanBoardProps { orders?: Order[]; lanes?: OrderStatus[]; counts?: Partial<Record<OrderStatus, number>>; title?: string; onMove?: (id: string, status: OrderStatus, orders: Order[]) => void; onAction?: OrderCardProps['onAction'] }
export declare function KanbanBoard(props: KanbanBoardProps): React.ReactElement;
export interface LandingPageProps { logoSrc?: string; price?: number; videoSrc?: string; videoPoster?: string; reviews?: ReviewCardProps[]; whatsappNumber?: string; onOrder?: (order: Order) => void; height?: number }
export declare function LandingPage(props: LandingPageProps): React.ReactElement;
export interface AdminHeaderProps { logoSrc?: string; period?: string; user?: string }
export declare function AdminHeader(props: AdminHeaderProps): React.ReactElement;
export interface AdminDashboardProps { logoSrc?: string; orders?: Order[]; counts?: KanbanBoardProps['counts']; period?: string; user?: string; onMove?: KanbanBoardProps['onMove']; onAction?: OrderCardProps['onAction'] }
export declare function AdminDashboard(props: AdminDashboardProps): React.ReactElement;

declare global {
  interface Window {
    ShiftCart: {
      Icon: typeof Icon; Wordmark: typeof Wordmark; Button: typeof Button; Navbar: typeof Navbar; MobileFrame: typeof MobileFrame;
      StoryVideo: typeof StoryVideo; PriceTag: typeof PriceTag; ProductCard: typeof ProductCard; SavingsCalculator: typeof SavingsCalculator;
      IncludedList: typeof IncludedList; ReviewCard: typeof ReviewCard; StickyCta: typeof StickyCta; BottomSheet: typeof BottomSheet;
      TextField: typeof TextField; PhoneInput: typeof PhoneInput; GovernorateSelect: typeof GovernorateSelect; CheckoutForm: typeof CheckoutForm;
      KpiCard: typeof KpiCard; StatusBadge: typeof StatusBadge; OrderCard: typeof OrderCard; KanbanBoard: typeof KanbanBoard; AdminHeader: typeof AdminHeader;
      LandingPage: typeof LandingPage; AdminDashboard: typeof AdminDashboard;
      utils: { formatTnPhone(d: string): string; validateTnPhone(d: string): string | null; buildWhatsAppMessage(o: Partial<Order>): string; savingsFor(daily: number, homeCostPerDay: number, days: number): number; GOVERNORATES: string[]; SAMPLE_ORDERS: Order[] };
    };
  }
}
