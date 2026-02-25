import React from "react";
import { View, Pressable, type ViewProps, type PressableProps } from "react-native";
import { cn } from "@/lib/utils";
import { shadows } from "@design/tokens";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CardVariant = "default" | "elevated" | "flat" | "outline";

interface CardBaseProps {
  /** Visual style variant */
  variant?: CardVariant;
  /** Additional className */
  className?: string;
  children: React.ReactNode;
}

export type CardProps = CardBaseProps &
  (
    | ({ pressable: true } & Omit<PressableProps, "children" | "className">)
    | ({ pressable?: false } & Omit<ViewProps, "children" | "className">)
  );

// ─── Style Maps ──────────────────────────────────────────────────────────────

const variantClasses: Record<CardVariant, string> = {
  default: "bg-white rounded-lg",
  elevated: "bg-white rounded-lg",
  flat: "bg-sage-pale rounded-lg",
  outline: "bg-transparent rounded-lg border border-sage-pale",
};

const variantShadows: Record<CardVariant, (typeof shadows)[keyof typeof shadows]> = {
  default: shadows.card,
  elevated: shadows.elevated,
  flat: shadows.none,
  outline: shadows.none,
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View className={cn("px-lg pt-lg pb-sm", className)}>
      {children}
    </View>
  );
}

function CardContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View className={cn("px-lg py-md", className)}>
      {children}
    </View>
  );
}

function CardFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View className={cn("px-lg pt-sm pb-lg", className)}>
      {children}
    </View>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function Card({
  variant = "default",
  className,
  children,
  pressable,
  ...rest
}: CardProps) {
  const shadow = variantShadows[variant];
  const classes = cn(variantClasses[variant], "overflow-hidden", className);

  if (pressable) {
    const pressableProps = rest as Omit<PressableProps, "children" | "className">;
    return (
      <Pressable
        {...pressableProps}
        className={classes}
        style={({ pressed }) => [
          shadow,
          pressed && { opacity: 0.95, transform: [{ scale: 0.98 }] },
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View
      {...(rest as Omit<ViewProps, "children" | "className">)}
      className={classes}
      style={shadow}
    >
      {children}
    </View>
  );
}

// ─── Attach Sub-components ───────────────────────────────────────────────────

Card.Header = CardHeader;
Card.Content = CardContent;
Card.Footer = CardFooter;

export default Card;
