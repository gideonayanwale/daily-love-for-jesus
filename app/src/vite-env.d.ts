/// <reference types="vite/client" />

declare module "input-otp";
declare module "cmdk";
declare module "@radix-ui/react-navigation-menu";
declare module "@radix-ui/react-scroll-area";
declare module "@radix-ui/react-slider";
declare module "@radix-ui/react-select";

declare module "react-hook-form" {
  import * as React from "react";
  export const Controller: React.ComponentType<any>;
  export const FormProvider: React.ComponentType<any>;
  export function useFormContext(): any;
  export function useFormState(props?: any): any;
  export type ControllerProps<TFieldValues = any, TName = any> = {
    name: TName;
    render: (props: { field: any; fieldState: any; formState: any }) => React.ReactElement;
    [key: string]: any;
  };
  export type FieldPath<TFieldValues = any> = string;
  export type FieldValues = Record<string, any>;
  export function useForm<T = any>(options?: any): any;
}
