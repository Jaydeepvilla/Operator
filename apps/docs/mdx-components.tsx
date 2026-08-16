import type { ComponentType, ReactNode } from 'react';
import defaultComponents from 'fumadocs-ui/mdx';
import { Callout } from 'fumadocs-ui/components/callout';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { File, Folder, Files } from 'fumadocs-ui/components/files';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { Card, Cards } from 'fumadocs-ui/components/card';
import { ImageZoom } from 'fumadocs-ui/components/image-zoom';
import { Heading } from 'fumadocs-ui/components/heading';

export type MDXComponents = Record<string, ComponentType<any> | ((props: any) => ReactNode) | any>;

export function useMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultComponents,
    Callout,
    TypeTable,
    Accordion,
    Accordions,
    Tab,
    Tabs,
    File,
    Folder,
    Files,
    Step,
    Steps,
    Card,
    Cards,
    ImageZoom,
    Heading,
    ...components,
  };
}
