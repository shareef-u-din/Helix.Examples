import { useEffect } from 'react';
import { GetStaticPaths, GetStaticProps } from 'next';
import NotFound from 'components/NotFound';
import Layout from 'components/Layout';
import config from 'temp/config';
import {
  SitecoreContext,
  ComponentPropsContext,
  handleExperienceEditorFastRefresh,
} from '@sitecore-jss/sitecore-jss-nextjs';
import { SitecorePageProps, SitecoreContextValues } from 'lib/page-props';
import { sitecorePagePropsFactory } from 'lib/page-props-factory';
import { componentFactory } from 'temp/componentFactory';
import { graphQLSitemapService } from 'lib/graphql-sitemap-service';
import { NavigationDataContext } from 'components/Navigation/NavigationDataContext';

const SitecorePage = ({
  notFound,
  layoutData,
  componentProps,
  navigation,
}: SitecorePageProps): JSX.Element => {
  useEffect(() => {
    // Since Experience Editor does not support Fast Refresh need to refresh EE chromes after Fast Refresh finished
    handleExperienceEditorFastRefresh();
  }, []);

  if (notFound || !layoutData) {
    // Shouldn't hit this (as long as 'notFound' is being returned below), but just to be safe
    return <NotFound />;
  }

  const context: SitecoreContextValues = {
    route: layoutData.sitecore.route,
    itemId: layoutData.sitecore.route?.itemId,
    ...layoutData.sitecore.context,
  };

  const PageLayout = () => (
    <NavigationDataContext value={navigation}>
      <ComponentPropsContext value={componentProps}>
        <SitecoreContext<SitecoreContextValues>
          componentFactory={componentFactory}
          context={context}
        >
          <Layout layoutData={layoutData} />
        </SitecoreContext>
      </ComponentPropsContext>
    </NavigationDataContext>
  );

  return <PageLayout />;
};

// This function gets called at build and export time to determine
// pages for SSG ("paths", as tokenized array).
export const getStaticPaths: GetStaticPaths = async (context) => {
  // Fallback, along with revalidate in getStaticProps (below),
  // enables Incremental Static Regeneration. This allows us to
  // leave certain (or all) paths empty if desired and static pages
  // will be generated on request (development mode in this example).
  // Alternatively, the entire sitemap could be pre-rendered
  // ahead of time (non-development mode in this example).
  // See https://nextjs.org/docs/basic-features/data-fetching#incremental-static-regeneration

  if (process.env.NODE_ENV !== 'development') {
    const ROOT_ITEM = `/sitecore/content/${config.jssAppName}/home`;
    const paths = await graphQLSitemapService.fetchSSGSitemap(context.locales || [], ROOT_ITEM);

    return {
      paths,
      fallback: false,
    };
  }

  return {
    paths: [],
    fallback: 'blocking',
  };
};

// This function gets called at build time on server-side.
// It may be called again, on a serverless function, if
// revalidation (or fallback) is enabled and a new request comes in.
export const getStaticProps: GetStaticProps = async (context) => {
  const props = await sitecorePagePropsFactory.create(context);

  return {
    props,
    // Next.js will attempt to re-generate the page:
    // - When a request comes in
    // - At most once every 5 seconds
    revalidate: 5, // In seconds
  };
};

export default SitecorePage;
