'use client';

import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Trans } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import { InfoIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { DATE_FORMATS, DEFAULT_DOCUMENT_DATE_FORMAT } from '@documenso/lib/constants/date-formats';
import { DOCUMENT_DISTRIBUTION_METHODS } from '@documenso/lib/constants/document';
import { SUPPORTED_LANGUAGES } from '@documenso/lib/constants/i18n';
import { DEFAULT_DOCUMENT_TIME_ZONE, TIME_ZONES } from '@documenso/lib/constants/time-zones';
import { ZDocumentEmailSettingsSchema } from '@documenso/lib/types/document-email';
import { extractDocumentAuthMethods } from '@documenso/lib/utils/document-auth';
import { DocumentDistributionMethod, type Field, type Recipient } from '@documenso/prisma/client';
import type { TemplateWithData } from '@documenso/prisma/types/template';
import {
  DocumentGlobalAuthAccessSelect,
  DocumentGlobalAuthAccessTooltip,
} from '@documenso/ui/components/document/document-global-auth-access-select';
import {
  DocumentGlobalAuthActionSelect,
  DocumentGlobalAuthActionTooltip,
} from '@documenso/ui/components/document/document-global-auth-action-select';
import { DocumentSendEmailMessageHelper } from '@documenso/ui/components/document/document-send-email-message-helper';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@documenso/ui/primitives/accordion';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@documenso/ui/primitives/form/form';

import { DocumentEmailCheckboxes } from '../../components/document/document-email-checkboxes';
import { Combobox } from '../combobox';
import {
  DocumentFlowFormContainerActions,
  DocumentFlowFormContainerContent,
  DocumentFlowFormContainerFooter,
  DocumentFlowFormContainerHeader,
  DocumentFlowFormContainerStep,
} from '../document-flow/document-flow-root';
import { ShowFieldItem } from '../document-flow/show-field-item';
import type { DocumentFlowStep } from '../document-flow/types';
import { Input } from '../input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../select';
import { useStep } from '../stepper';
import { Textarea } from '../textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip';
import type { TAddTemplateSettingsFormSchema } from './add-template-settings.types';
import { ZAddTemplateSettingsFormSchema } from './add-template-settings.types';

export type AddTemplateSettingsFormProps = {
  documentFlow: DocumentFlowStep;
  recipients: Recipient[];
  fields: Field[];
  isEnterprise: boolean;
  isDocumentPdfLoaded: boolean;
  template: TemplateWithData;
  onSubmit: (_data: TAddTemplateSettingsFormSchema) => void;
};

export const AddTemplateSettingsFormPartial = ({
  documentFlow,
  recipients,
  fields,
  isEnterprise,
  isDocumentPdfLoaded,
  template,
  onSubmit,
}: AddTemplateSettingsFormProps) => {
  const { _ } = useLingui();

  const { documentAuthOption } = extractDocumentAuthMethods({
    documentAuth: template.authOptions,
  });

  const form = useForm<TAddTemplateSettingsFormSchema>({
    resolver: zodResolver(ZAddTemplateSettingsFormSchema),
    defaultValues: {
      title: template.title,
      externalId: template.externalId || undefined,
      globalAccessAuth: documentAuthOption?.globalAccessAuth || undefined,
      globalActionAuth: documentAuthOption?.globalActionAuth || undefined,
      meta: {
        subject: template.templateMeta?.subject ?? '',
        message: template.templateMeta?.message ?? '',
        timezone: template.templateMeta?.timezone ?? DEFAULT_DOCUMENT_TIME_ZONE,
        dateFormat: template.templateMeta?.dateFormat ?? DEFAULT_DOCUMENT_DATE_FORMAT,
        distributionMethod:
          template.templateMeta?.distributionMethod || DocumentDistributionMethod.EMAIL,
        redirectUrl: template.templateMeta?.redirectUrl ?? '',
        language: template.templateMeta?.language ?? 'en',
        emailSettings: ZDocumentEmailSettingsSchema.parse(template?.templateMeta?.emailSettings),
      },
    },
  });

  const { stepIndex, currentStep, totalSteps, previousStep } = useStep();

  const distributionMethod = form.watch('meta.distributionMethod');
  const emailSettings = form.watch('meta.emailSettings');

  // We almost always want to set the timezone to the user's local timezone to avoid confusion
  // when the document is signed.
  useEffect(() => {
    if (!form.formState.touchedFields.meta?.timezone && !template.templateMeta?.timezone) {
      form.setValue('meta.timezone', Intl.DateTimeFormat().resolvedOptions().timeZone);
    }
  }, [form, form.setValue, form.formState.touchedFields.meta?.timezone]);

  return (
    <>
      <DocumentFlowFormContainerHeader
        title={documentFlow.title}
        description={documentFlow.description}
      />

      <DocumentFlowFormContainerContent>
        {isDocumentPdfLoaded &&
          fields.map((field, index) => (
            <ShowFieldItem key={index} field={field} recipients={recipients} />
          ))}

        <Form {...form}>
          <fieldset
            className="flex h-full flex-col space-y-6"
            disabled={form.formState.isSubmitting}
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>
                    <Trans>Template title</Trans>
                  </FormLabel>

                  <FormControl>
                    <Input className="bg-background" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="meta.language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="inline-flex items-center">
                    <Trans>Language</Trans>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoIcon className="mx-2 h-4 w-4" />
                      </TooltipTrigger>

                      <TooltipContent className="text-foreground max-w-md space-y-2 p-4">
                        控制文件的語言，包括用於電子郵件通知的語言，以及生成並附加到文件的最終證書的語言。
                      </TooltipContent>
                    </Tooltip>
                  </FormLabel>

                  <FormControl>
                    <Select {...field} onValueChange={field.onChange}>
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        {Object.entries(SUPPORTED_LANGUAGES).map(([code, language]) => (
                          <SelectItem key={code} value={code}>
                            {language.full}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="globalAccessAuth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex flex-row items-center">
                    <Trans>Document access</Trans>
                    <DocumentGlobalAuthAccessTooltip />
                  </FormLabel>

                  <FormControl>
                    <DocumentGlobalAuthAccessSelect {...field} onValueChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="meta.distributionMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex flex-row items-center">
                    <Trans>Document Distribution Method</Trans>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoIcon className="mx-2 h-4 w-4" />
                      </TooltipTrigger>

                      <TooltipContent className="text-foreground max-w-md space-y-2 p-4">
                        <h2>
                          <strong>
                            <Trans>Document Distribution Method</Trans>
                          </strong>
                        </h2>

                        <p>
                          <Trans>
                            This is how the document will reach the recipients once the document is
                            ready for signing.
                          </Trans>
                        </p>

                        <ul className="ml-3.5 list-outside list-disc space-y-0.5 py-2">
                          <li>
                            <Trans>
                              <strong>Email</strong> - The recipient will be emailed the document to
                              sign, approve, etc.
                            </Trans>
                          </li>
                          <li>
                            <Trans>
                              <strong>Links</strong> - We will generate links which you can send to
                              the recipients manually.
                            </Trans>
                          </li>
                        </ul>

                        <Trans>
                          <strong>Note</strong> - If you use Links in combination with direct
                          templates, you will need to manually send the links to the remaining
                          recipients.
                        </Trans>
                      </TooltipContent>
                    </Tooltip>
                  </FormLabel>

                  <FormControl>
                    <Select {...field} onValueChange={field.onChange}>
                      <SelectTrigger className="bg-background text-muted-foreground">
                        <SelectValue data-testid="documentDistributionMethodSelectValue" />
                      </SelectTrigger>

                      <SelectContent position="popper">
                        {Object.values(DOCUMENT_DISTRIBUTION_METHODS).map(
                          ({ value, description }) => (
                            <SelectItem key={value} value={value}>
                              {_(description)}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              )}
            />

            {isEnterprise && (
              <FormField
                control={form.control}
                name="globalActionAuth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex flex-row items-center">
                      <Trans>Recipient action authentication</Trans>
                      <DocumentGlobalAuthActionTooltip />
                    </FormLabel>

                    <FormControl>
                      <DocumentGlobalAuthActionSelect {...field} onValueChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            {distributionMethod === DocumentDistributionMethod.EMAIL && (
              <Accordion type="multiple">
                <AccordionItem value="email-options" className="border-none">
                  <AccordionTrigger className="text-foreground rounded border px-3 py-2 text-left hover:bg-neutral-200/30 hover:no-underline">
                    <Trans>Email Options</Trans>
                  </AccordionTrigger>

                  <AccordionContent className="text-muted-foreground -mx-1 px-1 pt-4 text-sm leading-relaxed [&>div]:pb-0">
                    <div className="flex flex-col space-y-6">
                      <FormField
                        control={form.control}
                        name="meta.subject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              <Trans>
                                Subject <span className="text-muted-foreground">(Optional)</span>
                              </Trans>
                            </FormLabel>

                            <FormControl>
                              <Input {...field} />
                            </FormControl>

                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="meta.message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              <Trans>
                                Message <span className="text-muted-foreground">(Optional)</span>
                              </Trans>
                            </FormLabel>

                            <FormControl>
                              <Textarea className="bg-background h-32 resize-none" {...field} />
                            </FormControl>

                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <DocumentSendEmailMessageHelper />

                      <DocumentEmailCheckboxes
                        value={emailSettings}
                        onChange={(value) => form.setValue('meta.emailSettings', value)}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}

            <Accordion type="multiple">
              <AccordionItem value="advanced-options" className="border-none">
                <AccordionTrigger className="text-foreground rounded border px-3 py-2 text-left hover:bg-neutral-200/30 hover:no-underline">
                  <Trans>Advanced Options</Trans>
                </AccordionTrigger>

                <AccordionContent className="text-muted-foreground -mx-1 px-1 pt-4 text-sm leading-relaxed">
                  <div className="flex flex-col space-y-6">
                    <FormField
                      control={form.control}
                      name="externalId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex flex-row items-center">
                            <Trans>External ID</Trans>{' '}
                            <Tooltip>
                              <TooltipTrigger>
                                <InfoIcon className="mx-2 h-4 w-4" />
                              </TooltipTrigger>

                              <TooltipContent className="text-muted-foreground max-w-xs">
                                <Trans>
                                  Add an external ID to the template. This can be used to identify
                                  in external systems.
                                </Trans>
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>

                          <FormControl>
                            <Input className="bg-background" {...field} />
                          </FormControl>

                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="meta.dateFormat"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <Trans>Date Format</Trans>
                          </FormLabel>

                          <FormControl>
                            <Select {...field} onValueChange={field.onChange}>
                              <SelectTrigger className="bg-background">
                                <SelectValue />
                              </SelectTrigger>

                              <SelectContent>
                                {DATE_FORMATS.map((format) => (
                                  <SelectItem key={format.key} value={format.value}>
                                    {format.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>

                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="meta.timezone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <Trans>Time Zone</Trans>
                          </FormLabel>

                          <FormControl>
                            <Combobox
                              className="bg-background time-zone-field"
                              options={TIME_ZONES}
                              {...field}
                              onChange={(value) => value && field.onChange(value)}
                            />
                          </FormControl>

                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="meta.redirectUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex flex-row items-center">
                            <Trans>Redirect URL</Trans>{' '}
                            <Tooltip>
                              <TooltipTrigger>
                                <InfoIcon className="mx-2 h-4 w-4" />
                              </TooltipTrigger>

                              <TooltipContent className="text-muted-foreground max-w-xs">
                                <Trans>
                                  Add a URL to redirect the user to once the document is signed
                                </Trans>
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>

                          <FormControl>
                            <Input className="bg-background" {...field} />
                          </FormControl>

                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </fieldset>
        </Form>
      </DocumentFlowFormContainerContent>

      <DocumentFlowFormContainerFooter>
        <DocumentFlowFormContainerStep step={currentStep} maxStep={totalSteps} />

        <DocumentFlowFormContainerActions
          loading={form.formState.isSubmitting}
          disabled={form.formState.isSubmitting}
          canGoBack={stepIndex !== 0}
          onGoBackClick={previousStep}
          onGoNextClick={form.handleSubmit(onSubmit)}
        />
      </DocumentFlowFormContainerFooter>
    </>
  );
};
