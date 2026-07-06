import type { MDXComponents } from "mdx/types";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: (props) => <h1 className="text-2xl font-semibold text-gray-700" {...props} />,
    h2: (props) => <h2 className="mb-3 text-xl font-bold text-gray-600" {...props} />,
    h3: (props) => <h3 className="mb-3 text-lg font-bold text-gray-600" {...props} />,
    a: (props) => <a className="text-blue-600 hover:text-blue-500" {...props} />,

    ...components,
  };
}
