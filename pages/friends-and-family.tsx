import Head from 'next/head';
import Link from 'next/link';
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivacy } from '@/components/privacy/PrivacyProvider';
import { getMyProfile, submitCustomOrder } from '@/lib/apiClient';
import {
  CUSTOM_ORDER_PRODUCT_TYPES,
  CUSTOM_ORDER_SIZES,
  CustomOrderResponse
} from '@/types/customOrders';
import {
  CustomOrderErrors,
  CustomOrderFormValues,
  EMPTY_CUSTOM_ORDER,
  createIdempotencyKey,
  fileToReferenceImage,
  productTypeUsesSize,
  toCustomOrderRequest,
  validateCustomOrder
} from '@/features/customOrders/validation';
import { trackCustomOrderEvent } from '@/features/customOrders/analytics';
import styles from '@/styles/CustomOrder.module.scss';

const BUDGET_OPTIONS = [
  { value: '50', label: '$50' },
  { value: '75', label: '$75' },
  { value: '100', label: '$100' },
  { value: '150', label: '$150' },
  { value: '200_plus', label: '$200+' },
  { value: 'custom', label: 'custom' }
];

export default function FriendsAndFamilyCustomOrder() {
  const { currentUser } = useAuth();
  const { consent } = usePrivacy();
  const [values, setValues] = useState<CustomOrderFormValues>(EMPTY_CUSTOM_ORDER);
  const [images, setImages] = useState<File[]>([]);
  const [errors, setErrors] = useState<CustomOrderErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CustomOrderResponse | null>(null);
  const idempotencyKey = useRef(createIdempotencyKey());
  const started = useRef(false);

  useEffect(() => {
    if (!currentUser) return;
    setValues((current) => ({
      ...current,
      name: current.name || currentUser.displayName || '',
      email: current.email || currentUser.email || ''
    }));
    getMyProfile()
      .then((profile: any) => {
        setValues((current) => ({
          ...current,
          name: current.name || profile?.name || profile?.displayName || '',
          email: current.email || profile?.email || currentUser.email || '',
          phone: current.phone || profile?.phone || profile?.phoneNumber || ''
        }));
      })
      .catch(() => undefined);
  }, [currentUser]);

  const markStarted = () => {
    if (started.current) return;
    started.current = true;
    void trackCustomOrderEvent(consent.analytics, 'custom_order_started', {
      account_status: currentUser ? 'authenticated' : 'guest'
    });
  };

  const update = (field: keyof CustomOrderFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleImages = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Array.from(event.target.files || []);
    setImages(next);
    const validation = validateCustomOrder(values, next);
    setErrors((current) => ({ ...current, referenceImages: validation.referenceImages }));
    if (!validation.referenceImages && next.length) {
      void trackCustomOrderEvent(consent.analytics, 'custom_order_reference_uploaded', {
        count: next.length
      });
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateCustomOrder(values, images);
    setErrors(nextErrors);
    setSubmitError('');
    if (Object.keys(nextErrors).length) {
      document.getElementById('custom-order-form')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    setSubmitting(true);
    try {
      const references = await Promise.all(images.map(fileToReferenceImage));
      const response = await submitCustomOrder(
        toCustomOrderRequest(values, references, idempotencyKey.current)
      );
      setResult(response);
      void trackCustomOrderEvent(consent.analytics, 'custom_order_submitted', {
        product_type: values.productType,
        quantity: Number(values.quantity)
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      const message = error?.message || 'we could not send your request. please try again.';
      setSubmitError(message.toLowerCase());
      void trackCustomOrderEvent(consent.analytics, 'custom_order_submission_failed', {
        reason: String(error?.message || 'unknown').slice(0, 100)
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <>
        <Head>
          <title>Custom Order Sent | WMCYN</title>
          <meta name="robots" content="noindex" />
        </Head>
        <div className={styles.page}>
          <section className={styles.success} role="status">
            <div className={styles.globe}>🌎</div>
            <p className={styles.eyebrow}>request received</p>
            <h1>WE GOT YOU</h1>
            <p>your custom request has been sent to WMCYN.</p>
            <p><strong>we&apos;ll get back to you within 24 hours</strong> with a quote and what&apos;s possible.</p>
            <div className={styles.requestNumber}>request #{result.requestNumber}</div>
            <p className={styles.finePrint}>nothing will be made and you won&apos;t be charged until you approve the quote.</p>
            <Link href="/" className={styles.homeLink}>back to wmcyn.online</Link>
          </section>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Custom Order | WMCYN</title>
        <meta
          name="description"
          content="Tell WMCYN what you want made and what you are trying to spend."
        />
        <link rel="canonical" href="https://wmcyn.online/friends-and-family/" />
      </Head>
      <div className={styles.page}>
        <header className={styles.header}>
          <Link href="/" className={styles.backLink}>← wmcyn.online</Link>
          <span className={styles.accountState}>{currentUser ? 'signed in' : 'guest request'}</span>
        </header>

        <section className={styles.hero}>
          <p className={styles.eyebrow}>friends &amp; family</p>
          <h1>custom order</h1>
          <p className={styles.intro}>
            tell us what you want, what you&apos;re trying to spend, and any ideas you have.
            WMCYN will review your request and get back to you within 24 hours with what&apos;s possible and a quote.
          </p>
          <div className={styles.steps} aria-label="request process">
            <span>tell us</span><span>we review</span><span>you approve</span>
          </div>
        </section>

        <form
          id="custom-order-form"
          className={styles.form}
          onSubmit={handleSubmit}
          onFocus={markStarted}
          noValidate
        >
          <section className={styles.formSection}>
            <h2>contact</h2>
            <p className={styles.sectionCopy}>where should we send your quote?</p>
            <div className={styles.twoColumn}>
              <Field label="name" error={errors.name}>
                <input
                  value={values.name}
                  onChange={(event) => update('name', event.target.value)}
                  autoComplete="name"
                  maxLength={120}
                  aria-invalid={Boolean(errors.name)}
                />
              </Field>
              <Field label="email" error={errors.email}>
                <input
                  type="email"
                  value={values.email}
                  onChange={(event) => update('email', event.target.value)}
                  autoComplete="email"
                  inputMode="email"
                  maxLength={254}
                  aria-invalid={Boolean(errors.email)}
                />
              </Field>
            </div>
            <Field label="phone (optional)" error={errors.phone}>
              <input
                type="tel"
                value={values.phone}
                onChange={(event) => update('phone', event.target.value)}
                autoComplete="tel"
                inputMode="tel"
                maxLength={40}
              />
            </Field>
          </section>

          <section className={styles.formSection}>
            <h2>the idea</h2>
            <Field label="what would you call it?" hint="example: crash world hoodie" error={errors.productTitle}>
              <input
                value={values.productTitle}
                onChange={(event) => update('productTitle', event.target.value)}
                maxLength={120}
                aria-invalid={Boolean(errors.productTitle)}
              />
            </Field>
            <Field
              label="description / story"
              hint="colors, graphics, materials, context—tell us in your own words."
              error={errors.description}
            >
              <textarea
                value={values.description}
                onChange={(event) => update('description', event.target.value)}
                rows={6}
                maxLength={4000}
                aria-invalid={Boolean(errors.description)}
              />
            </Field>
            <div className={styles.twoColumn}>
              <Field label="product type" error={errors.productType}>
                <select
                  value={values.productType}
                  onChange={(event) => {
                    update('productType', event.target.value);
                    if (!productTypeUsesSize(event.target.value)) update('size', '');
                  }}
                  aria-invalid={Boolean(errors.productType)}
                >
                  <option value="">choose one</option>
                  {CUSTOM_ORDER_PRODUCT_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              {productTypeUsesSize(values.productType) && (
                <Field label="size" error={errors.size}>
                  <select
                    value={values.size}
                    onChange={(event) => update('size', event.target.value)}
                    aria-invalid={Boolean(errors.size)}
                  >
                    <option value="">choose one</option>
                    {CUSTOM_ORDER_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
                  </select>
                </Field>
              )}
            </div>
            {values.productType === 'OTHER' && (
              <Field label="what kind of product?" error={errors.customProductType}>
                <input
                  value={values.customProductType}
                  onChange={(event) => update('customProductType', event.target.value)}
                  maxLength={80}
                />
              </Field>
            )}
            <Field label="quantity" hint="made-to-order does not mean inventory is available." error={errors.quantity}>
              <input
                type="number"
                min="1"
                max="100"
                inputMode="numeric"
                value={values.quantity}
                onChange={(event) => update('quantity', event.target.value)}
                aria-invalid={Boolean(errors.quantity)}
              />
            </Field>
            <Field
              label="reference images (optional)"
              hint="up to 3 jpeg, png, or webp images. 2MB each."
              error={errors.referenceImages}
            >
              <label className={styles.upload}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleImages}
                />
                <span>{images.length ? 'change images' : 'add images'}</span>
              </label>
              {images.length > 0 && (
                <ul className={styles.fileList}>
                  {images.map((file) => <li key={`${file.name}-${file.size}`}>{file.name}</li>)}
                </ul>
              )}
            </Field>
          </section>

          <section className={styles.formSection}>
            <h2>what are you trying to pay?</h2>
            <p className={styles.sectionCopy}>give us a number. we&apos;ll see what we can make happen.</p>
            <div className={styles.budgets}>
              {BUDGET_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className={values.budgetOption === option.value ? styles.budgetSelected : styles.budget}
                  aria-pressed={values.budgetOption === option.value}
                  onClick={() => {
                    update('budgetOption', option.value);
                    void trackCustomOrderEvent(consent.analytics, 'custom_order_budget_selected', {
                      option: option.value
                    });
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {values.budgetOption === 'custom' && (
              <Field label="custom budget" error={errors.customBudget}>
                <div className={styles.moneyInput}>
                  <span>$</span>
                  <input
                    type="number"
                    min="1"
                    max="100000"
                    inputMode="decimal"
                    value={values.customBudget}
                    onChange={(event) => update('customBudget', event.target.value)}
                    aria-invalid={Boolean(errors.customBudget)}
                  />
                </div>
              </Field>
            )}
            {errors.customBudget && values.budgetOption !== 'custom' && (
              <p className={styles.error} role="alert">{errors.customBudget}</p>
            )}
            <p className={styles.disclaimer}>
              your budget is not a quote, charge, purchase, authorization, or guarantee that WMCYN can produce the piece at that price.
            </p>
          </section>

          <section className={styles.formSection}>
            <h2>anything else?</h2>
            <Field label="additional notes (optional)" error={errors.additionalNotes}>
              <textarea
                value={values.additionalNotes}
                onChange={(event) => update('additionalNotes', event.target.value)}
                rows={4}
                maxLength={2000}
              />
            </Field>
          </section>

          <aside className={styles.philosophy}>
            <p className={styles.eyebrow}>more than the object</p>
            <h2>made with a history</h2>
            <p>
              every WMCYN piece can have a digital identity connected to the physical object. scan it to
              discover its story, when and where it was made, its edition, and the experiences connected
              to it. as the piece moves through the world, that record can grow with new moments and
              ownership history.
            </p>
            <p className={styles.metadataNote}>
              what you submit here is your idea. WMCYN only establishes verified production and edition details after a piece is actually made.
            </p>
          </aside>

          {submitError && <p className={styles.submitError} role="alert">{submitError}</p>}
          <div className={styles.submitBar}>
            <div>
              <strong>send request</strong>
              <span>no charge. no commitment.</span>
            </div>
            <button type="submit" disabled={submitting}>
              {submitting ? 'sending…' : 'send to WMCYN'}
            </button>
          </div>
          <p className={styles.privacy}>
            by sending this request, you agree that WMCYN may use these details to review and respond to it.
            see our <Link href="/privacy">privacy notice</Link>.
          </p>
        </form>
      </div>
    </>
  );
}

function Field({
  label,
  hint,
  error,
  children
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      {hint && <span className={styles.hint}>{hint}</span>}
      {children}
      {error && <span className={styles.error} role="alert">{error}</span>}
    </label>
  );
}
