import type { MDXComponents } from "mdx/types";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: (props) => (
      <h1 className="text-2xl font-semibold text-gray-700" {...props} />
    ),
    h2: (props) => (
      <h2 className="mb-3 text-xl font-bold text-gray-600" {...props} />
    ),
    h3: (props) => (
      <h3 className="mb-3 text-lg font-bold text-gray-600" {...props} />
    ),
    a: (props) => (
      <a className="text-blue-600 hover:text-blue-500" {...props} />
    ),
    ul: ({ children }) => <ul className="list-disc list-inside">{children}</ul>,
    table: ({ children }) => (
      <div className="overflow-x-auto my-8">
        <table className="min-w-full border-collapse border border-gray-300 text-left text-sm">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead>{children}</thead>
    ),
    tbody: ({ children }) => (
      <tbody className="divide-y divide-gray-200">
        {children}
      </tbody>
    ),
    tr: ({ children }) => (
      <tr className="hover:bg-gray-50 transition-colors">
        {children}
      </tr>
    ),
    th: ({ children }) => (
      <th className="px-4 py-3 font-semibold text-gray-900">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-3 text-gray-700 align-top">
        {children}
      </td>
    ),

    ...components,
  };
}
