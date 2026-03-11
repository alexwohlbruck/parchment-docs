import { APIPage as BaseAPIPage, type ApiPageProps } from 'fumadocs-openapi/ui'
import { openapi } from '@/lib/openapi'

export function APIPage(props: ApiPageProps) {
  // Use OPENAPI_SPEC_URL at build time (e.g. on Netlify) when the spec can't be fetched from localhost
  const document =
    process.env.OPENAPI_SPEC_URL ?? props.document
  return (
    <BaseAPIPage
      {...openapi.getAPIPageProps({ ...props, document })}
    />
  )
}
